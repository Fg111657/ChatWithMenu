"""
Audit Log System for Phase 3.6

Tracks all changes to menus, items, and categories with user attribution.
"""

import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
import db_models
import jonlog

logger = jonlog.getLogger()

# Audit log model will be added to db_models.py


def log_audit_event(
    db,
    restaurant_id,
    menu_id,
    user_id,
    user_email,
    action_type,
    entity_type,
    entity_id=None,
    before_json=None,
    after_json=None,
    metadata_json=None
):
    """
    Log an audit event.

    Args:
        db: SQLAlchemy session
        restaurant_id: Restaurant ID
        menu_id: Menu ID (can be None for restaurant-level actions)
        user_id: Supabase user UUID (from JWT)
        user_email: User email (from JWT)
        action_type: Type of action (see ACTION_TYPES below)
        entity_type: Type of entity ('menu', 'category', 'item')
        entity_id: ID of entity (menu_id, category index, item index)
        before_json: JSON snapshot before change (for undo)
        after_json: JSON snapshot after change
        metadata_json: Additional metadata (import_mode, counts, etc.)

    Action Types:
        MENU_IMPORTED - Menu data imported (replace/append/new)
        MENU_SAVED - Manual save of menu_data
        MENU_CREATED - New menu created
        MENU_RENAMED - Menu name changed
        MENU_DELETED - Menu deleted
        MENU_REORDERED - Menu order changed
        ITEM_UPDATED - Single item edited
        ITEM_MARK_REVIEWED - Single item marked as reviewed
        BULK_REVIEW_CATEGORY - All items in category marked as reviewed
        BULK_REVIEW_MENU - All items in menu marked as reviewed
        UNDO - Undo of previous action
    """

    # Generate diff summary
    diff_summary = generate_diff_summary(
        action_type=action_type,
        entity_type=entity_type,
        before_json=before_json,
        after_json=after_json,
        metadata_json=metadata_json
    )

    # Log to console for debugging
    logger.info(
        f"AUDIT: {action_type} by {user_email} "
        f"(restaurant={restaurant_id}, menu={menu_id}, entity={entity_type}:{entity_id})"
    )
    logger.info(f"AUDIT DIFF: {diff_summary}")

    # Write to database
    try:
        audit_entry = db_models.AuditLog(
            restaurant_id=restaurant_id,
            menu_id=menu_id,
            actor_user_id=user_id,
            actor_email=user_email,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            before_json=before_json,
            after_json=after_json,
            metadata_json=metadata_json,
            diff_summary=diff_summary,
            created_at=datetime.utcnow()
        )
        db.add(audit_entry)
        db.commit()
        logger.info(f"AUDIT DB WRITE SUCCESS: entry added and committed")
    except Exception as e:
        logger.error(f"AUDIT DB WRITE FAILED: {type(e).__name__}: {e}", exc_info=True)
        # Don't raise - audit logging should never break the main operation
        db.rollback()


def log_auth_event(
    db,
    user_id,
    user_email,
    action_type,
    success=True,
    failure_reason=None,
    request_obj=None
):
    """
    Log an authentication/authorization event.

    Args:
        db: SQLAlchemy session
        user_id: User ID (can be None for failed login attempts)
        user_email: Email address
        action_type: USER_LOGIN_SUCCESS, USER_LOGIN_FAILURE, USER_SIGNUP_SUCCESS, etc.
        success: True/False
        failure_reason: String describing why auth failed (optional)
        request_obj: Flask request object for IP/user-agent capture

    Action Types:
        USER_LOGIN_SUCCESS - Successful login
        USER_LOGIN_FAILURE - Failed login attempt
        USER_SIGNUP_SUCCESS - Successful account creation
        USER_SIGNUP_FAILURE - Failed account creation
        USER_PROFILE_MODIFIED - User profile changed
        USER_PREFERENCES_CHANGED - User preferences changed
        USER_LOGOUT - User logged out
    """

    # Extract request metadata
    metadata_json = {
        "success": success,
    }

    if request_obj:
        metadata_json["ip"] = request_obj.headers.get("X-Forwarded-For", request_obj.remote_addr)
        metadata_json["user_agent"] = request_obj.headers.get("User-Agent")

    if failure_reason:
        metadata_json["failure_reason"] = failure_reason

    # Generate diff summary
    if action_type == "USER_LOGIN_SUCCESS":
        ip = metadata_json.get("ip", "unknown")
        diff_summary = f"User {user_email} logged in successfully from {ip}"
    elif action_type == "USER_LOGIN_FAILURE":
        ip = metadata_json.get("ip", "unknown")
        diff_summary = f"Failed login attempt for {user_email} from {ip}: {failure_reason or 'unknown reason'}"
    elif action_type == "USER_SIGNUP_SUCCESS":
        diff_summary = f"New user created: {user_email}"
    elif action_type == "USER_SIGNUP_FAILURE":
        diff_summary = f"Failed signup attempt for {user_email}: {failure_reason or 'unknown reason'}"
    elif action_type == "USER_PROFILE_MODIFIED":
        diff_summary = f"User {user_email} modified their profile"
    elif action_type == "USER_PREFERENCES_CHANGED":
        diff_summary = f"User {user_email} changed their preferences"
    elif action_type == "USER_LOGOUT":
        diff_summary = f"User {user_email} logged out"
    else:
        diff_summary = f"{action_type} for {user_email}"

    # Log to console
    logger.info(f"AUTH AUDIT: {action_type} - {user_email} - {diff_summary}")

    # Write to database
    try:
        audit_entry = db_models.AuditLog(
            restaurant_id=None,  # Auth events have no restaurant context
            menu_id=None,
            actor_user_id=str(user_id) if user_id else "unknown",
            actor_email=user_email,
            action_type=action_type,
            entity_type="auth",
            entity_id=str(user_id) if user_id else None,
            before_json=None,
            after_json=None,
            metadata_json=metadata_json,
            diff_summary=diff_summary,
            created_at=datetime.utcnow()
        )
        db.add(audit_entry)
        db.commit()
        logger.info(f"AUTH AUDIT DB WRITE SUCCESS")
    except Exception as e:
        logger.error(f"AUTH AUDIT DB WRITE FAILED: {type(e).__name__}: {e}", exc_info=True)
        # Don't raise - audit logging should never break the main operation
        db.rollback()


def generate_diff_summary(action_type, entity_type, before_json, after_json, metadata_json):
    """
    Generate human-readable summary of what changed.

    Examples:
        "Imported menu with 45 items (replace mode)"
        "Updated item 'Burger': changed price from $10.00 to $12.00"
        "Marked 12 items as reviewed in category 'Appetizers'"
    """

    if action_type == 'MENU_IMPORTED':
        mode = metadata_json.get('import_mode', 'unknown') if metadata_json else 'unknown'
        item_count = metadata_json.get('item_count', '?') if metadata_json else '?'
        return f"Imported menu with {item_count} items ({mode} mode)"

    elif action_type == 'MENU_SAVED':
        return "Manual save of menu data"

    elif action_type == 'MENU_CREATED':
        menu_name = after_json.get('name', 'Unnamed') if after_json else 'Unnamed'
        return f"Created new menu: {menu_name}"

    elif action_type == 'MENU_RENAMED':
        old_name = before_json.get('name', 'Unknown') if before_json else 'Unknown'
        new_name = after_json.get('name', 'Unknown') if after_json else 'Unknown'
        return f"Renamed menu from '{old_name}' to '{new_name}'"

    elif action_type == 'MENU_DELETED':
        menu_name = before_json.get('name', 'Unknown') if before_json else 'Unknown'
        return f"Deleted menu: {menu_name}"

    elif action_type == 'ITEM_UPDATED':
        if before_json and after_json:
            changes = []
            item_name = after_json.get('name', 'Unknown Item')

            # Check what changed
            if before_json.get('name') != after_json.get('name'):
                changes.append(f"name: '{before_json.get('name')}' → '{after_json.get('name')}'")

            if before_json.get('price') != after_json.get('price'):
                changes.append(f"price: ${before_json.get('price')} → ${after_json.get('price')}")

            if before_json.get('price_type') != after_json.get('price_type'):
                changes.append(f"price_type: {before_json.get('price_type')} → {after_json.get('price_type')}")

            if before_json.get('allergens') != after_json.get('allergens'):
                changes.append(f"allergens: {before_json.get('allergens')} → {after_json.get('allergens')}")

            if changes:
                return f"Updated item '{item_name}': {', '.join(changes)}"
            else:
                return f"Updated item '{item_name}'"

        return "Updated item (details unavailable)"

    elif action_type == 'ITEM_MARK_REVIEWED':
        item_name = after_json.get('name', 'Unknown Item') if after_json else 'Unknown Item'
        return f"Marked item '{item_name}' as reviewed"

    elif action_type == 'BULK_REVIEW_CATEGORY':
        category_name = metadata_json.get('category_name', 'Unknown') if metadata_json else 'Unknown'
        count = metadata_json.get('item_count', '?') if metadata_json else '?'
        return f"Marked {count} items as reviewed in category '{category_name}'"

    elif action_type == 'BULK_REVIEW_MENU':
        count = metadata_json.get('item_count', '?') if metadata_json else '?'
        return f"Marked {count} items as reviewed in entire menu"

    elif action_type == 'UNDO':
        original_action = metadata_json.get('original_action_type', 'unknown') if metadata_json else 'unknown'
        return f"Undid {original_action}"

    else:
        return f"{action_type} on {entity_type}"


# Action type constants for menu operations
ACTION_TYPES = {
    'MENU_IMPORTED': 'MENU_IMPORTED',
    'MENU_SAVED': 'MENU_SAVED',
    'MENU_CREATED': 'MENU_CREATED',
    'MENU_RENAMED': 'MENU_RENAMED',
    'MENU_DELETED': 'MENU_DELETED',
    'MENU_REORDERED': 'MENU_REORDERED',
    'ITEM_UPDATED': 'ITEM_UPDATED',
    'ITEM_MARK_REVIEWED': 'ITEM_MARK_REVIEWED',
    'BULK_REVIEW_CATEGORY': 'BULK_REVIEW_CATEGORY',
    'BULK_REVIEW_MENU': 'BULK_REVIEW_MENU',
    'UNDO': 'UNDO',
}

# Action type constants for auth operations
AUTH_ACTION_TYPES = {
    'USER_LOGIN_SUCCESS': 'USER_LOGIN_SUCCESS',
    'USER_LOGIN_FAILURE': 'USER_LOGIN_FAILURE',
    'USER_SIGNUP_SUCCESS': 'USER_SIGNUP_SUCCESS',
    'USER_SIGNUP_FAILURE': 'USER_SIGNUP_FAILURE',
    'USER_PROFILE_MODIFIED': 'USER_PROFILE_MODIFIED',
    'USER_PREFERENCES_CHANGED': 'USER_PREFERENCES_CHANGED',
    'USER_LOGOUT': 'USER_LOGOUT',
}


if __name__ == "__main__":
    print("Audit log system initialized.")
    print(f"\nAvailable action types: {list(ACTION_TYPES.keys())}")
    print("\nNext steps:")
    print("1. Add AuditLog model to db_models.py")
    print("2. Run migrations to create audit_log table")
    print("3. Uncomment database write in log_audit_event()")
    print("4. Add audit logging to all write endpoints in server.py")
