"""
JWT Verification for Supabase Tokens

Supports two methods:
1. JWKS (recommended) - fetches public keys from Supabase
2. JWT Secret - verifies with shared secret
"""

import os
import jwt
import requests
from datetime import datetime
import jonlog

logger = jonlog.getLogger()

# Cache for JWKS keys
_jwks_cache = None
_jwks_cache_time = None


def verify_jwt_token(token: str) -> dict:
    """
    Verify a Supabase JWT token.

    Uses JWKS if available (recommended), falls back to JWT secret.

    Args:
        token: JWT token from Authorization header

    Returns:
        dict: Decoded token payload with user info

    Raises:
        Exception: If token is invalid, expired, or verification fails
    """
    supabase_url = os.getenv('SUPABASE_URL')
    jwt_secret = os.getenv('SUPABASE_JWT_SECRET')

    # Diagnostic: Log env var availability (never log actual values)
    logger.info(f"🔧 JWT verification environment check:")
    logger.info(f"   SUPABASE_URL: {'✅ set' if supabase_url else '❌ MISSING'}")
    logger.info(f"   SUPABASE_JWT_SECRET: {'✅ set' if jwt_secret else '⚠️  not set (will use JWKS)'}")

    if not supabase_url:
        logger.error("❌ SUPABASE_URL not set in environment - cannot verify JWT")
        raise RuntimeError("SUPABASE_URL not set in environment")

    # Try JWKS first (recommended)
    try:
        return verify_with_jwks(token, supabase_url)
    except Exception as e:
        logger.warning(f"JWKS verification failed: {e}, trying JWT secret")

    # Fall back to JWT secret
    if jwt_secret:
        try:
            return verify_with_secret(token, jwt_secret)
        except Exception as e:
            raise Exception(f"JWT secret verification failed: {e}")

    raise RuntimeError(
        "JWT verification failed. Need either JWKS (auto) or SUPABASE_JWT_SECRET. "
        "Get JWT Secret from: Dashboard → Settings → API → JWT Secret"
    )


def verify_with_jwks(token: str, supabase_url: str) -> dict:
    """
    Verify JWT using JWKS (public keys from Supabase).

    This is the recommended approach - requires publishable/anon key for JWKS fetch.

    Args:
        token: JWT token
        supabase_url: Supabase project URL

    Returns:
        dict: Decoded token payload

    Raises:
        Exception: If verification fails
    """
    global _jwks_cache, _jwks_cache_time

    # Get anon key for JWKS fetch
    anon_key = os.getenv('SUPABASE_ANON_KEY')
    if not anon_key:
        logger.error("❌ SUPABASE_ANON_KEY not set - cannot fetch JWKS")
        raise RuntimeError(
            "SUPABASE_ANON_KEY not set. Needed for JWKS fetch. "
            "Get it from: Dashboard → Settings → API → Project API keys (anon/public)"
        )

    # Fetch JWKS if not cached or cache is old (5 minutes)
    if not _jwks_cache or not _jwks_cache_time or \
       (datetime.now() - _jwks_cache_time).seconds > 300:

        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        logger.info(f"Fetching JWKS from {jwks_url}")

        # Include apikey header (required by Supabase)
        headers = {
            'apikey': anon_key,
            'Authorization': f'Bearer {anon_key}'
        }
        response = requests.get(jwks_url, headers=headers, timeout=5)
        response.raise_for_status()

        _jwks_cache = response.json()
        _jwks_cache_time = datetime.now()
        logger.info("JWKS cached successfully")

    # Get signing key from JWKS
    unverified_header = jwt.get_unverified_header(token)
    key_id = unverified_header.get('kid')

    if not key_id:
        raise Exception("Token missing 'kid' in header")

    # Find the right key
    signing_key = None
    key_data = None
    for key in _jwks_cache.get('keys', []):
        if key.get('kid') == key_id:
            key_data = key
            # Support both RSA (RS256) and EC (ES256) keys
            if key.get('kty') == 'RSA':
                signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
            elif key.get('kty') == 'EC':
                signing_key = jwt.algorithms.ECAlgorithm.from_jwk(key)
            else:
                raise Exception(f"Unsupported key type: {key.get('kty')}")
            break

    if not signing_key:
        raise Exception(f"Signing key '{key_id}' not found in JWKS")

    # Determine algorithm from key
    algorithm = key_data.get('alg', 'RS256')

    # Verify token
    logger.info(f"🔍 Attempting JWT decode with:")
    logger.info(f"   Algorithm: {algorithm}")
    logger.info(f"   Audience: authenticated")
    logger.info(f"   Issuer: {supabase_url}/auth/v1")
    logger.info(f"   Key ID (kid): {key_id}")
    logger.info(f"   Key type (kty): {key_data.get('kty')}")

    try:
        decoded = jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            audience='authenticated',
            issuer=f"{supabase_url}/auth/v1"
        )
        logger.info(f"✅ JWT successfully verified with JWKS (kid: {key_id})")
        return decoded
    except jwt.InvalidSignatureError as e:
        logger.error(f"❌ Signature verification failed for kid {key_id}")
        logger.error(f"   Error: {e}")
        logger.error(f"   Token header: {jwt.get_unverified_header(token)}")
        logger.error(f"   Key data: {key_data}")
        raise ValueError(f"JWT signature verification failed: {e}")
    except jwt.InvalidAudienceError as e:
        logger.error(f"❌ Audience validation failed: {e}")
        raise ValueError(f"JWT audience validation failed: {e}")
    except jwt.InvalidIssuerError as e:
        logger.error(f"❌ Issuer validation failed: {e}")
        raise ValueError(f"JWT issuer validation failed: {e}")
    except Exception as e:
        logger.error(f"❌ JWT verification failed: {type(e).__name__}: {e}")
        logger.error(f"   Token header: {jwt.get_unverified_header(token)}")
        raise ValueError(f"JWT verification failed: {e}")


def verify_with_secret(token: str, jwt_secret: str) -> dict:
    """
    Verify JWT using shared secret.

    Args:
        token: JWT token
        jwt_secret: JWT secret from Supabase dashboard

    Returns:
        dict: Decoded token payload

    Raises:
        Exception: If verification fails
    """
    decoded = jwt.decode(
        token,
        jwt_secret,
        algorithms=['HS256'],
        audience='authenticated'
    )

    return decoded


if __name__ == "__main__":
    print("JWT Verification Module")
    print("\nSupports two methods:")
    print("1. JWKS (recommended) - fetches public keys from Supabase")
    print("   Needs: SUPABASE_URL")
    print("2. JWT Secret - verifies with shared secret")
    print("   Needs: SUPABASE_URL + SUPABASE_JWT_SECRET")
    print("\nGet JWT Secret from: Dashboard → Settings → API → JWT Secret")
