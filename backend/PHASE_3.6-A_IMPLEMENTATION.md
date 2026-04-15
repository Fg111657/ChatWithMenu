# Phase 3.6-A Implementation Guide — Backend Audit Log

## Goal
Track all changes to menus with user attribution from Supabase JWT.

---

## Step 1: Add AuditLog Model to Database

**File:** `db_models.py`

Add this model after the existing models:

```python
class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    menu_id = Column(Integer, ForeignKey('menus.id'), nullable=True)

    # User attribution (from Supabase JWT)
    actor_user_id = Column(String(255), nullable=False)  # Supabase UUID
    actor_email = Column(String(255), nullable=False)

    # Event details
    action_type = Column(String(50), nullable=False)  # MENU_IMPORTED, ITEM_UPDATED, etc.
    entity_type = Column(String(50), nullable=False)  # 'menu', 'category', 'item'
    entity_id = Column(Integer, nullable=True)        # ID of affected entity

    # Change tracking
    before_json = Column(JSON, nullable=True)   # Snapshot before change (for undo)
    after_json = Column(JSON, nullable=True)    # Snapshot after change
    metadata_json = Column(JSON, nullable=True) # Additional context (import_mode, counts, etc.)
    diff_summary = Column(Text, nullable=True)  # Human-readable summary

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action_type} by {self.actor_email}>"
```

**Create the table:**

Run this in Python shell or migration script:

```python
from db_models import Base, create_all, engine
create_all(engine)
```

Or manually create the table with SQL:

```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL,
    menu_id INTEGER,
    actor_user_id VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    before_json TEXT,
    after_json TEXT,
    metadata_json TEXT,
    diff_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
);

CREATE INDEX idx_audit_restaurant ON audit_log(restaurant_id);
CREATE INDEX idx_audit_menu ON audit_log(menu_id);
CREATE INDEX idx_audit_user ON audit_log(actor_user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

---

## Step 2: Enable Audit Logging in audit_log.py

**File:** `audit_log.py`

Uncomment the database write section in `log_audit_event()`:

```python
def log_audit_event(...):
    # ... existing code ...

    # Uncomment this:
    audit_entry = db_models.AuditLog(
        restaurant_id=restaurant_id,
        menu_id=menu_id,
        actor_user_id=user_id,
        actor_email=user_email,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        before_json=before_json,
        after_json=after_json,
        metadata_json=metadata_json,
        diff_summary=diff_summary,
        created_at=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
```

---

## Step 3: Add Auth Middleware to Protected Endpoints

**File:** `server.py`

Import the middleware:

```python
from auth_middleware import require_auth, get_current_user, get_user_id, get_user_email
from audit_log import log_audit_event, ACTION_TYPES
```

**Example: Protect menu import endpoint**

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth  # Add this decorator
    def post(self, restaurant_id, menu_id):
        user = get_current_user()  # Get authenticated user

        with GetDB() as db:
            # ... existing import logic ...

            # Before changing menu_data, save snapshot
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... perform import ...

            # After import, log audit event
            log_audit_event(
                db=db,
                restaurant_id=restaurant_id,
                menu_id=menu_id,
                user_id=user.id,  # Supabase UUID
                user_email=user.email,
                action_type=ACTION_TYPES['MENU_IMPORTED'],
                entity_type='menu',
                entity_id=menu_id,
                before_json={'menu_data': before_snapshot},
                after_json={'menu_data': menu.menu_data},
                metadata_json={
                    'import_mode': 'replace',  # or 'append'
                    'item_count': len(parsed_items)
                }
            )

            return {'success': True, 'message': 'Menu imported and logged'}
```

---

## Step 4: Add Logging to All Write Endpoints

Add `@require_auth` and audit logging to these endpoints:

### Menu Operations
- `POST /restaurant/<id>/menu/<id>/import` → MENU_IMPORTED
- `PUT /restaurant/<id>/menu/<id>` → MENU_SAVED
- `POST /restaurant/<id>/menu` → MENU_CREATED
- `DELETE /restaurant/<id>/menu/<id>` → MENU_DELETED

### Item Operations
- `PUT /restaurant/<id>/menu/<id>/item/<idx>` → ITEM_UPDATED
- `POST /restaurant/<id>/menu/<id>/item/<idx>/review` → ITEM_MARK_REVIEWED

### Bulk Operations
- `POST /restaurant/<id>/menu/<id>/category/<idx>/review-all` → BULK_REVIEW_CATEGORY
- `POST /restaurant/<id>/menu/<id>/review-all` → BULK_REVIEW_MENU

---

## Step 5: Add /api/me Endpoint for Testing

**File:** `server.py`

Add a test endpoint to verify JWT authentication:

```python
@api_namespace.route('/me')
class MeResource(Resource):
    @require_auth
    def get(self):
        """Get current authenticated user info"""
        user = get_current_user()
        return {
            'user_id': user.id,
            'email': user.email,
            'user_metadata': user.user_metadata
        }
```

**Test with curl:**

```bash
# Get JWT token from frontend (Supabase login)
TOKEN="your_jwt_token_here"

curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/me
```

Expected response:
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com",
  "user_metadata": {}
}
```

---

## Step 6: Test Audit Logging

### Test 1: Manual Database Check

After performing an action (e.g., menu import), check the audit log:

```sql
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
```

Expected columns filled:
- `actor_user_id` (Supabase UUID)
- `actor_email` (user email)
- `action_type` (e.g., 'MENU_IMPORTED')
- `diff_summary` (human-readable)

### Test 2: Query Audit Log via API

Add an endpoint to retrieve audit logs:

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/history')
class MenuHistoryResource(Resource):
    @require_auth
    def get(self, restaurant_id, menu_id):
        """Get audit log for a menu"""
        with GetDB() as db:
            logs = db.query(db_models.AuditLog).filter_by(
                restaurant_id=restaurant_id,
                menu_id=menu_id
            ).order_by(db_models.AuditLog.created_at.desc()).limit(50).all()

            return [{
                'id': log.id,
                'actor_email': log.actor_email,
                'action_type': log.action_type,
                'entity_type': log.entity_type,
                'diff_summary': log.diff_summary,
                'created_at': log.created_at.isoformat()
            } for log in logs]
```

**Test:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/restaurant/11/menu/1/history
```

---

## Acceptance Criteria

✅ **Database:**
- `audit_log` table exists with all columns
- Indexes created for performance

✅ **Authentication:**
- `@require_auth` decorator works on protected endpoints
- `/api/me` endpoint returns user info from JWT
- Invalid/missing tokens return 401

✅ **Audit Logging:**
- All write operations create audit log entries
- `actor_user_id` and `actor_email` populated from JWT
- `before_json` and `after_json` captured for undo
- `diff_summary` is human-readable

✅ **Testing:**
- Manual database queries show audit entries
- `/api/.../history` endpoint returns logs
- No performance degradation (audit writes are fast)

---

## Common Issues

### Issue 1: "RuntimeError: Supabase env vars not set"
**Fix:** Ensure backend `.env` has real rotated keys:
```bash
cd /root/chatwithmenu/Backend/python
cat .env  # Check keys are present
source venv/bin/activate
python supabase_client.py  # Test connection
```

### Issue 2: "401 Unauthorized" on protected endpoints
**Fix:** Frontend must send JWT token in header:
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

fetch('/api/restaurant/11', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Issue 3: Audit log table doesn't exist
**Fix:** Create table manually or run migrations:
```python
from db_models import Base, create_all, engine
create_all(engine)
```

---

## Next Steps (After 3.6-A)

Once audit logging is working:

1. **Phase 3.6-B:** Frontend History Drawer UI
   - Show audit logs in MenuManager
   - Filter by action type
   - Display user email and time

2. **Phase 3.6-C:** Undo Functionality
   - Restore `before_json` snapshots
   - Time-limited (1 hour)
   - Undo creates new audit entry

3. **Phase 3.6-D:** Role-Based Permissions
   - Store roles (owner/manager/server)
   - Check roles before allowing operations
   - Servers can only view, not edit

---

## Files Modified

- ✅ `db_models.py` - Add AuditLog model
- ✅ `audit_log.py` - Enable database writes
- ✅ `auth_middleware.py` - Already created
- ✅ `supabase_client.py` - Already created
- ✅ `server.py` - Add @require_auth to endpoints + audit logging

---

## Estimated Time

- Database setup: 30 minutes
- Auth middleware integration: 1 hour
- Audit logging for all endpoints: 2-3 hours
- Testing: 1 hour

**Total: ~4-5 hours**
