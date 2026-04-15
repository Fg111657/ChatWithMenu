"""
Rate Limiting Helpers for My Table Feature

Prevents spam and abuse through server-side rate limits.
All limits reset daily at midnight UTC.
"""

from datetime import datetime
from flask_restx import abort
import db_models
from constants import RATE_LIMITS


def check_rate_limit(db, user_id, action_type):
    """
    Check if user has exceeded rate limit for action type.

    Uses atomic UPDATE with WHERE guard to prevent race conditions.

    Args:
        db: Database session
        user_id: Integer user ID
        action_type: 'invite', 'question', 'answer', or 'signal'

    Raises:
        HTTPException: 429 if rate limit exceeded

    Side effects:
        Creates or increments RateLimit record atomically

    SECURITY:
        - Uses atomic UPDATE with WHERE guard (race-condition safe)
        - Handles concurrent first-request race with IntegrityError
        - Retry once if concurrent request incremented first
        - Single transaction boundary per request
    """
    from sqlalchemy import update
    from sqlalchemy.exc import IntegrityError

    if action_type not in RATE_LIMITS:
        raise ValueError(f"Invalid action_type: {action_type}")

    max_count = RATE_LIMITS[action_type]
    today = datetime.utcnow().strftime('%Y-%m-%d')

    # Get or create rate limit record for today
    rate_limit = db.query(db_models.RateLimit).filter_by(
        user_id=user_id,
        action_type=action_type,
        window_date=today
    ).first()

    if not rate_limit:
        # First action of the day - create record with count=1
        # Handle race condition: two requests may both try to INSERT
        try:
            rate_limit = db_models.RateLimit(
                user_id=user_id,
                action_type=action_type,
                window_date=today,
                count=1
            )
            db.add(rate_limit)
            db.flush()  # Get the ID but don't commit yet
            return  # OK, first request
        except IntegrityError:
            # Another concurrent request created the row first
            # Rollback and re-query, then proceed to atomic UPDATE
            db.rollback()
            rate_limit = db.query(db_models.RateLimit).filter_by(
                user_id=user_id,
                action_type=action_type,
                window_date=today
            ).first()
            # Fall through to atomic UPDATE below

    # ATOMIC INCREMENT: Only increment if count < max_count
    # This WHERE guard prevents race conditions
    result = db.execute(
        update(db_models.RateLimit)
        .where(db_models.RateLimit.id == rate_limit.id)
        .where(db_models.RateLimit.count < max_count)
        .values(count=db_models.RateLimit.count + 1)
    )

    if result.rowcount == 1:
        # Successfully incremented (atomic operation succeeded)
        return  # OK, within limit

    # rowcount == 0 means either:
    # 1. Limit already exceeded, OR
    # 2. Another concurrent request just incremented and now exceeds limit
    # Re-fetch to get current count
    db.refresh(rate_limit)
    current_count = rate_limit.count

    if current_count >= max_count:
        # Limit exceeded
        abort(429, f'Rate limit exceeded: {max_count} {action_type}s per day. Try again tomorrow.')

    # Edge case: Another request incremented but didn't exceed limit
    # Retry atomic increment once
    result = db.execute(
        update(db_models.RateLimit)
        .where(db_models.RateLimit.id == rate_limit.id)
        .where(db_models.RateLimit.count < max_count)
        .values(count=db_models.RateLimit.count + 1)
    )

    if result.rowcount == 1:
        # Retry succeeded
        return  # OK

    # Retry failed - limit must be exceeded now
    db.refresh(rate_limit)
    abort(429, f'Rate limit exceeded: {max_count} {action_type}s per day. Try again tomorrow.')


def increment_rate_limit(db, user_id, action_type):
    """
    Increment rate limit counter after successful action.

    NOTE: This is only needed if check_rate_limit is called
    before the action (for dry-run validation). If check_rate_limit
    is called right before commit, it auto-increments.

    Args:
        db: Database session
        user_id: Integer user ID
        action_type: 'invite', 'question', 'answer', or 'signal'
    """
    # This is handled in check_rate_limit now
    pass


def get_remaining_actions(db, user_id, action_type):
    """
    Get remaining actions for user today.

    Args:
        db: Database session
        user_id: Integer user ID
        action_type: 'invite', 'question', 'answer', or 'signal'

    Returns:
        int: Number of actions remaining today
    """
    if action_type not in RATE_LIMITS:
        return 0

    max_count = RATE_LIMITS[action_type]
    today = datetime.utcnow().strftime('%Y-%m-%d')

    rate_limit = db.query(db_models.RateLimit).filter_by(
        user_id=user_id,
        action_type=action_type,
        window_date=today
    ).first()

    if not rate_limit:
        return max_count  # All actions remaining

    remaining = max_count - rate_limit.count
    return max(0, remaining)
