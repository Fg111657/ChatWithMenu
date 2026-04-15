"""
Supabase Client Wrapper (Backend Only)

CRITICAL SECURITY:
- Uses SERVICE_ROLE_KEY which bypasses all Row Level Security
- NEVER expose this client to frontend
- NEVER log the key
- Only use for backend auth verification and admin operations
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import pathlib

# Load environment variables from .env file
# NOTE: override=True for LOCAL DEV ONLY. In production, system env takes precedence.
_env_path = pathlib.Path(__file__).parent / ".env"
_is_production = os.getenv('FLASK_ENV') == 'production' or os.getenv('ENV') == 'production'
load_dotenv(_env_path, override=not _is_production)


def get_supabase() -> Client:
    """
    Get Supabase client (only needed for admin DB operations).

    NOTE: For JWT verification only, you don't need this client.
    JWT verification happens via the JWT secret/JWKS, not service role key.

    Returns:
        Client: Supabase client with admin privileges

    Raises:
        RuntimeError: If environment variables are not set
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise RuntimeError(
            "Supabase environment variables not set. "
            "NOTE: Service role key is only needed for admin DB operations, "
            "not for JWT verification. For Phase 3.6-A, you only need SUPABASE_URL."
        )

    return create_client(url, key)


# Singleton instance (lazy-loaded)
_supabase_instance = None


def get_supabase_singleton() -> Client:
    """
    Get singleton Supabase client instance.

    Returns:
        Client: Shared Supabase client instance
    """
    global _supabase_instance
    if _supabase_instance is None:
        _supabase_instance = get_supabase()
    return _supabase_instance


def verify_jwt_token(token: str) -> dict:
    """
    Verify a Supabase JWT token and return user info.

    Args:
        token: JWT token from frontend (from Supabase auth)

    Returns:
        dict: User information from token

    Raises:
        Exception: If token is invalid or expired
    """
    supabase = get_supabase_singleton()

    try:
        # Get user from token
        response = supabase.auth.get_user(token)
        return response.user
    except Exception as e:
        raise Exception(f"Invalid or expired token: {str(e)}")


if __name__ == "__main__":
    # Safe test: verify connection without writing data
    print("Testing Supabase connection...")
    try:
        supabase = get_supabase()
        print("✅ Supabase client created successfully")

        # Test read-only operation (list users)
        print("\nTesting auth.admin.list_users() [read-only]...")
        response = supabase.auth.admin.list_users()
        print(f"✅ Connection successful! Found {len(response)} users")

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Copy .env.template to .env")
        print("2. Replace placeholder keys with real keys from Supabase dashboard")
        print("3. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set")
