"""
User Helper Functions for My Table Feature

Maps Supabase UUID (from JWT) to integer user_id (from database).
Provides user context utilities.
"""

from flask import request
from flask_restx import abort
import db_models
import jonlog

logger = jonlog.getLogger()


def get_current_user_id(db):
    """
    Get current user's integer ID from database.

    Maps Supabase UUID (immutable) to legacy integer user_id.
    Falls back to email for one-time backfill of existing users.

    Args:
        db: Database session

    Returns:
        int: User ID from users table

    Raises:
        HTTPException: 401 if user not found in database

    CRITICAL SECURITY:
        - NEVER trust user_id from request.json
        - ALWAYS use this function to get authenticated user_id
        - User ID comes from verified JWT token only
        - Maps by immutable Supabase UUID (not mutable email)
    """
    if not hasattr(request, 'current_user'):
        logger.error("get_current_user_id() called outside @require_auth context")
        abort(401, "Not authenticated")

    supabase_user = request.current_user
    supabase_uid = supabase_user.id  # Immutable UUID from JWT 'sub' claim
    email = supabase_user.email

    if not supabase_uid:
        logger.error("Supabase user has no UUID in JWT")
        abort(401, "Invalid JWT: missing user ID")

    # PRIMARY: Map by immutable Supabase UUID
    user = db.query(db_models.User).filter_by(supabase_uid=supabase_uid).first()

    if user:
        # Fast path: User already mapped by UUID
        return user.id

    # FALLBACK: One-time backfill for existing users (before migration 007)
    if not email:
        logger.error(f"Supabase user has no email for backfill: {supabase_uid}")
        abort(401, "User email not found in JWT")

    logger.info(f"🔄 Backfilling supabase_uid for existing user: email={email}")

    user = db.query(db_models.User).filter_by(email=email).first()

    if user:
        # Backfill: Set supabase_uid for this user (one-time operation)
        if user.supabase_uid and user.supabase_uid != supabase_uid:
            # CRITICAL: User already has a different supabase_uid!
            # This means email was reused or JWT is wrong
            logger.error(
                f"❌ SECURITY: Email {email} mapped to different Supabase UIDs! "
                f"Existing: {user.supabase_uid}, JWT: {supabase_uid}"
            )
            abort(401, "Account conflict detected. Please contact support.")

        # Set supabase_uid and commit
        user.supabase_uid = supabase_uid
        db.commit()
        logger.info(f"✅ Backfilled supabase_uid for user {user.id}")
        return user.id

    # User not found by UUID or email
    logger.error(f"User not found in database: supabase_uid={supabase_uid}, email={email}")
    abort(401, "User account not found. Please create an account first.")

    return user.id


def get_bidirectional_table_members(db, user_id):
    """
    Get all accepted table member IDs (bidirectional).

    Includes:
    - People user invited who accepted
    - People who invited user and user accepted

    Args:
        db: Database session
        user_id: Integer user ID

    Returns:
        list[int]: List of table member user IDs (including self)
    """
    # Get connections where user is the inviter
    outgoing = db.query(db_models.TableConnection.table_member_user_id).filter_by(
        user_id=user_id,
        status='accepted'
    ).all()

    # Get connections where user is the invitee
    incoming = db.query(db_models.TableConnection.user_id).filter_by(
        table_member_user_id=user_id,
        status='accepted'
    ).all()

    # Combine and add self
    member_ids = [user_id]
    member_ids.extend([row[0] for row in outgoing])
    member_ids.extend([row[0] for row in incoming])

    # Remove duplicates
    return list(set(member_ids))


def is_table_member(db, user_id, other_user_id):
    """
    Check if two users are connected (accepted table members).

    Args:
        db: Database session
        user_id: Integer user ID
        other_user_id: Integer other user ID

    Returns:
        bool: True if connected, False otherwise
    """
    if user_id == other_user_id:
        return True  # Self is always a member

    # Check bidirectional
    connection = db.query(db_models.TableConnection).filter(
        db_models.TableConnection.status == 'accepted',
        (
            (db_models.TableConnection.user_id == user_id) &
            (db_models.TableConnection.table_member_user_id == other_user_id)
        ) | (
            (db_models.TableConnection.user_id == other_user_id) &
            (db_models.TableConnection.table_member_user_id == user_id)
        )
    ).first()

    return connection is not None


def get_question_asker_id(db, question_id):
    """
    Get the user ID of the person who asked a question.

    Args:
        db: Database session
        question_id: Integer question ID

    Returns:
        int: User ID of asker, or None if question not found
    """
    question = db.query(db_models.TableQuestion).filter_by(id=question_id).first()
    return question.asker_user_id if question else None


def can_see_question(db, user_id, question):
    """
    Check if user can see a question (membership-scoped).

    Args:
        db: Database session
        user_id: Integer user ID
        question: TableQuestion object

    Returns:
        bool: True if user can see question
    """
    # Can see own questions
    if question.asker_user_id == user_id:
        return True

    # Can see if question visibility is table_only and user is table member
    if question.visibility == 'table_only':
        return is_table_member(db, user_id, question.asker_user_id)

    # Private questions only visible to asker
    return False


def can_see_signal(db, user_id, signal):
    """
    Check if user can see a safety signal (membership-scoped).

    Args:
        db: Database session
        user_id: Integer user ID
        signal: SafetySignal object

    Returns:
        bool: True if user can see signal
    """
    # Can see own signals
    if signal.user_id == user_id:
        return True

    # Can see if signal visibility is table_only and user is table member
    if signal.visibility == 'table_only':
        return is_table_member(db, user_id, signal.user_id)

    # Private signals only visible to creator
    return False
