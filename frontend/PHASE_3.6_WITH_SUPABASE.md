# Phase 3.6 — Audit + Accountability (With Supabase Auth)

## Updated Plan with Supabase Integration

Supabase is now integrated for auth. Phase 3.6 will leverage Supabase to track **who** made changes.

---

## 3.6-A: Backend Audit Log (WITH USER TRACKING)

### Database Schema

**Audit Log Table** (in your existing SQLite/Postgres DB)

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  menu_id INTEGER REFERENCES menus(id),

  -- User tracking (from Supabase JWT)
  user_id VARCHAR(255),          -- Supabase user UUID
  user_email VARCHAR(255),        -- Email from JWT

  -- Event details
  event_type VARCHAR(50),         -- 'menu_import', 'item_edit', 'bulk_review', etc.
  action VARCHAR(50),             -- 'create', 'update', 'delete', 'undo'

  -- Target
  target_type VARCHAR(50),        -- 'menu', 'item', 'category'
  target_id INTEGER,

  -- What changed
  diff_summary TEXT,              -- Human-readable summary
  metadata JSONB,                 -- Full before/after snapshots

  -- When
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_restaurant ON audit_log(restaurant_id);
CREATE INDEX idx_audit_menu ON audit_log(menu_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

### Logging Implementation

**Where to log:**
- Menu import (replace/append)
- Menu create/rename/delete/reorder
- Item edit (name, price, allergens, description, price_type)
- Bulk review ("Mark X items as reviewed")
- Undo operations

**How to log:**

```python
def log_audit_event(db, restaurant_id, menu_id, user, event_type, action, target_type, target_id, diff_summary, metadata=None):
    """
    Log an audit event.

    Args:
        db: SQLAlchemy session
        restaurant_id: Restaurant ID
        menu_id: Menu ID (or None)
        user: User object from verify_jwt_token()
        event_type: Type of event (e.g., 'menu_import')
        action: Action taken (e.g., 'create', 'update', 'delete')
        target_type: Type of target (e.g., 'menu', 'item')
        target_id: ID of target
        diff_summary: Human-readable summary
        metadata: Dict with before/after snapshots
    """
    log_entry = AuditLog(
        restaurant_id=restaurant_id,
        menu_id=menu_id,
        user_id=user.id,  # Supabase UUID
        user_email=user.email,
        event_type=event_type,
        action=action,
        target_type=target_type,
        target_id=target_id,
        diff_summary=diff_summary,
        metadata=metadata
    )
    db.add(log_entry)
    db.commit()
```

**Example usage:**

```python
# Menu import
log_audit_event(
    db=db,
    restaurant_id=restaurant_id,
    menu_id=menu_id,
    user=request.current_user,  # From JWT
    event_type='menu_import',
    action='replace',
    target_type='menu',
    target_id=menu_id,
    diff_summary=f'Replaced menu with {len(new_items)} items',
    metadata={
        'import_type': 'replace',
        'previous_menu_data': old_menu_data,
        'new_menu_data': new_menu_data
    }
)

# Item edit
log_audit_event(
    db=db,
    restaurant_id=restaurant_id,
    menu_id=menu_id,
    user=request.current_user,
    event_type='item_edit',
    action='update',
    target_type='item',
    target_id=item_id,
    diff_summary=f'Updated item "{item_name}": changed price from $10 to $12',
    metadata={
        'before': old_item_dict,
        'after': new_item_dict
    }
)
```

---

## 3.6-B: Frontend "History" Drawer

**Location:** MenuManager screen

**UI Components:**
1. "History" button next to menu selector
2. Drawer slides in from right
3. Shows chronological list of events

**Display format:**
```
┌─────────────────────────────────────────────┐
│ Menu History                            [X] │
├─────────────────────────────────────────────┤
│ Filters: [All] [Imports] [Edits] [Reviews] │
├─────────────────────────────────────────────┤
│                                             │
│ ○ Menu Import (Replace)                     │
│   by owner@example.com                      │
│   2 hours ago                               │
│   Replaced menu with 45 items               │
│   [Undo]                                    │
│                                             │
│ ○ Item Edit                                 │
│   by manager@example.com                    │
│   3 hours ago                               │
│   Updated "Burger": changed price $10→$12   │
│                                             │
│ ○ Bulk Review                               │
│   by owner@example.com                      │
│   1 day ago                                 │
│   Marked 12 items as reviewed               │
│                                             │
└─────────────────────────────────────────────┘
```

**API endpoint:**

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/history')
class MenuHistoryResource(Resource):
    @require_auth
    def get(self, restaurant_id, menu_id):
        """Get audit log for a menu"""
        with GetDB() as db:
            logs = db.query(AuditLog).filter_by(
                restaurant_id=restaurant_id,
                menu_id=menu_id
            ).order_by(AuditLog.created_at.desc()).limit(50).all()

            return [{
                'id': log.id,
                'user_email': log.user_email,
                'event_type': log.event_type,
                'action': log.action,
                'diff_summary': log.diff_summary,
                'created_at': log.created_at.isoformat(),
                'can_undo': can_undo(log)  # Logic: < 1 hour old, user has permission
            } for log in logs]
```

---

## 3.6-C: Undo Last Change

**Scope:** Undo menu imports and item edits

**Rules:**
- Only undo changes from the last 1 hour
- Only owner/manager can undo (not servers)
- Undo creates a new audit log entry (type: "undo")
- Cannot undo an undo

**Implementation:**

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/undo/<int:log_id>')
class UndoResource(Resource):
    @require_auth
    def post(self, restaurant_id, menu_id, log_id):
        """Undo a change"""
        user = request.current_user

        with GetDB() as db:
            # Get the audit log entry
            log = db.query(AuditLog).get(log_id)

            if not log:
                return {'error': 'Audit log not found'}, 404

            # Check permissions
            if not user_has_role(user, restaurant_id, ['owner', 'manager']):
                return {'error': 'Insufficient permissions'}, 403

            # Check time limit (1 hour)
            if (datetime.now() - log.created_at).total_seconds() > 3600:
                return {'error': 'Undo time limit exceeded (1 hour)'}, 400

            # Restore previous state
            if log.event_type == 'menu_import':
                menu = db.query(Menu).get(menu_id)
                menu.menu_data = log.metadata['previous_menu_data']
                db.commit()

                # Log the undo
                log_audit_event(
                    db=db,
                    restaurant_id=restaurant_id,
                    menu_id=menu_id,
                    user=user,
                    event_type='undo',
                    action='undo',
                    target_type='menu',
                    target_id=menu_id,
                    diff_summary=f'Undid menu import from {log.created_at.isoformat()}',
                    metadata={'original_log_id': log_id}
                )

                return {'success': True, 'message': 'Menu import undone'}

            # Similar logic for item edits...
```

---

## 3.6-D: Role-Based Permissions

**Roles:**
- **Owner**: Full access (import, edit, delete, undo, settings)
- **Manager**: Can import, edit, undo (cannot delete menus or change settings)
- **Server**: View-only + can flag items for review

**Where to store roles:**

**Option 1:** Supabase user metadata (recommended)
```json
{
  "user_metadata": {
    "restaurants": {
      "11": "owner",
      "12": "manager"
    }
  }
}
```

**Option 2:** Your DB (simpler for now)
```sql
CREATE TABLE restaurant_users (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  user_id VARCHAR(255),  -- Supabase UUID
  role VARCHAR(50),       -- 'owner', 'manager', 'server'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Permission checks:**

```python
def user_has_role(user, restaurant_id, allowed_roles):
    """Check if user has one of the allowed roles"""
    with GetDB() as db:
        association = db.query(RestaurantUser).filter_by(
            user_id=user.id,
            restaurant_id=restaurant_id
        ).first()

        if not association:
            return False

        return association.role in allowed_roles


# Usage in endpoints:
@require_auth
def post(self, restaurant_id, menu_id):
    user = request.current_user

    if not user_has_role(user, restaurant_id, ['owner', 'manager']):
        return {'error': 'Insufficient permissions'}, 403

    # ... proceed with operation
```

**Frontend:**
- Hide/disable UI based on role
- Show role badge in dashboard header
- Owner can assign roles to other users (add/remove/change)

---

## Implementation Order

1. **3.6-A Backend (2-3 days)**
   - Create audit_log table
   - Add logging to all write operations
   - Extract user info from JWT
   - Test logging works

2. **3.6-B History UI (2-3 days)**
   - Create History drawer component
   - Add API endpoint for audit logs
   - Display events with filters
   - Show user email and time

3. **3.6-C Undo (1-2 days)**
   - Add undo endpoint
   - Implement time limit check
   - Add "Undo" button in History drawer
   - Test undo for imports and edits

4. **3.6-D Permissions (2-3 days)**
   - Create restaurant_users table (or use Supabase metadata)
   - Add permission checks to all write endpoints
   - Update frontend to hide/disable based on role
   - Add role management UI for owners

---

## Acceptance Criteria

✅ **3.6-A Complete:**
- Audit log table exists
- All write operations log events
- User email tracked from JWT
- No performance impact

✅ **3.6-B Complete:**
- History drawer shows events
- Filters work (All, Imports, Edits, Reviews)
- User email and time displayed
- Events are chronological

✅ **3.6-C Complete:**
- Undo works for imports and edits
- Time limit enforced (1 hour)
- Undo creates audit log entry
- Cannot undo an undo

✅ **3.6-D Complete:**
- Roles stored and checked
- Server can only view (cannot edit)
- Manager can edit but not delete
- Owner has full access
- Frontend UI respects roles

---

## Why This Matters

**Before Phase 3.6:**
- No visibility into who changed what
- Fear of using Replace (might lose data)
- No accountability
- Cannot rollback mistakes

**After Phase 3.6:**
- Full transparency (who/what/when)
- Confidence to use Replace during service
- Clear accountability
- Safety net (undo within 1 hour)

This enables owners to trust the system and delegate to managers/servers.
