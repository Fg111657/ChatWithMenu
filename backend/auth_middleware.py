"""
Authentication Middleware for Supabase JWT Verification

Provides decorators and utilities to verify Supabase JWT tokens
and extract user information from requests.
"""

from functools import wraps
from flask import request
from jwt_verification import verify_jwt_token
import jonlog

logger = jonlog.getLogger()


class User:
    """Simple wrapper for JWT user data"""
    def __init__(self, jwt_payload):
        self.id = jwt_payload.get('sub')  # Supabase uses 'sub' for user ID
        self.email = jwt_payload.get('email')
        self.user_metadata = jwt_payload.get('user_metadata', {})
        self.raw_jwt = jwt_payload


def require_auth(f):
    """
    Decorator to require Supabase JWT authentication.

    Usage:
        @api_namespace.route('/protected')
        class ProtectedResource(Resource):
            @require_auth
            def get(self):
                user = request.current_user
                return {'user_id': user.id, 'email': user.email}

    The decorator:
    1. Extracts JWT token from Authorization header
    2. Verifies token with Supabase
    3. Adds user info to request.current_user
    4. Returns 401 if token is missing or invalid
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        # Diagnostic: Log auth attempt
        logger.info(f"🔐 Auth check for {request.method} {request.path}")

        if not auth_header:
            logger.warning("❌ Missing Authorization header")
            return {'error': 'Missing Authorization header'}, 401

        if not auth_header.startswith('Bearer '):
            logger.warning(f"❌ Invalid Authorization header format (first 20 chars): {auth_header[:20]}")
            return {'error': 'Invalid Authorization header format. Expected: Bearer <token>'}, 401

        token = auth_header.replace('Bearer ', '')

        # Diagnostic: Log token presence and length (never log actual token)
        logger.info(f"🔍 Token received: length={len(token)} chars")

        try:
            # Verify token and get JWT payload
            jwt_payload = verify_jwt_token(token)

            # Wrap in User object and add to request context
            user = User(jwt_payload)
            request.current_user = user

            # Also set user_id for backward compatibility with existing endpoints
            request.user_id = user.id

            logger.info(f"✅ Authenticated user: {user.email} (id: {user.id[:8]}...)")

            return f(*args, **kwargs)

        except Exception as e:
            # Diagnostic: Log detailed failure reason
            logger.error(f"❌ Token verification failed: {type(e).__name__}: {str(e)}")
            logger.error(f"   Endpoint: {request.method} {request.path}")
            logger.error(f"   Token length: {len(token)} chars")
            return {'error': f'Invalid or expired token: {str(e)}'}, 401

    return wrapper


def get_current_user():
    """
    Get the current authenticated user from the request context.

    Returns:
        User object from Supabase (has .id, .email, .user_metadata, etc.)

    Raises:
        RuntimeError: If called outside of @require_auth context
    """
    if not hasattr(request, 'current_user'):
        raise RuntimeError("get_current_user() called outside @require_auth context")

    return request.current_user


def get_user_id():
    """Get current user ID (Supabase UUID)"""
    return get_current_user().id


def get_user_email():
    """Get current user email"""
    return get_current_user().email


def get_user_role(restaurant_id):
    """
    Get user's role for a specific restaurant.

    Args:
        restaurant_id: Restaurant ID to check role for

    Returns:
        str: Role ('owner', 'manager', 'server') or None if no access

    TODO: Implement role storage and lookup.
    For now, returns 'owner' for all authenticated users.
    """
    # TODO: Query restaurant_users table or Supabase user metadata
    # For Phase 3.6-A, we'll just track user_id in audit log
    # Role-based access control is Phase 3.6-D
    return 'owner'


def require_role(allowed_roles):
    """
    Decorator to require specific role(s) for a restaurant.

    Usage:
        @api_namespace.route('/restaurant/<int:restaurant_id>/delete')
        class DeleteRestaurant(Resource):
            @require_auth
            @require_role(['owner'])
            def delete(self, restaurant_id):
                # Only owners can delete
                pass

    Args:
        allowed_roles: List of allowed roles (e.g., ['owner', 'manager'])
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Extract restaurant_id from kwargs
            restaurant_id = kwargs.get('restaurant_id')

            if not restaurant_id:
                logger.error("require_role used on endpoint without restaurant_id parameter")
                return {'error': 'Internal server error'}, 500

            user = get_current_user()
            user_role = get_user_role(restaurant_id)

            if not user_role or user_role not in allowed_roles:
                logger.warning(
                    f"Access denied: user {user.email} has role '{user_role}' "
                    f"but needs one of {allowed_roles} for restaurant {restaurant_id}"
                )
                return {
                    'error': 'Insufficient permissions',
                    'required_role': allowed_roles,
                    'your_role': user_role
                }, 403

            return f(*args, **kwargs)

        return wrapper
    return decorator


if __name__ == "__main__":
    print("Auth middleware loaded. Use @require_auth decorator to protect endpoints.")
    print("\nExample usage:")
    print("""
    from auth_middleware import require_auth, get_current_user

    @api_namespace.route('/me')
    class MeResource(Resource):
        @require_auth
        def get(self):
            user = get_current_user()
            return {
                'user_id': user.id,
                'email': user.email
            }
    """)
