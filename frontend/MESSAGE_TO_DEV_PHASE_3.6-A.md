# Message to Junior Dev — Phase 3.6-A Implementation

## Current Status

✅ **Engineering complete:**
- Phases 3.1 → 3.5-B deployed and tested
- 165/165 tests passing
- Safe deployment pipeline (`./deploy.sh`)
- Supabase integration configured

✅ **Keys rotated and ready:**
- Real rotated Supabase keys need to be placed in `.env` files
- Security model correct (anon vs service role separation)

---

## Your Tasks (In Order)

### 1. Update Environment Files with Real Rotated Keys

**Backend:** `/root/chatwithmenu/Backend/python/.env`

```bash
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**Frontend:** `/root/cwm-frontend-react/.env`

```bash
DANGEROUSLY_DISABLE_HOST_CHECK=true

REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Get keys from:** https://supabase.com/dashboard → Your Project → Settings → API

**CRITICAL:**
- ❌ NEVER commit `.env` files
- ❌ NEVER log or print keys
- ❌ NEVER use service role key in frontend
- ✅ `.env` is already in `.gitignore`

---

### 2. Test Backend Supabase Connection

```bash
cd /root/chatwithmenu/Backend/python
source venv/bin/activate
python supabase_client.py
```

**Expected output:**
```
Testing Supabase connection...
✅ Supabase client created successfully

Testing auth.admin.list_users() [read-only]...
✅ Connection successful! Found X users
```

**If it fails:**
- Check `.env` file has real keys (not placeholders)
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure venv is activated

---

### 3. Frontend Build + Deploy Rule

**Always deploy with:**

```bash
cd /root/cwm-frontend-react
./deploy.sh
```

**Test frontend build:**
```bash
cd /root/cwm-frontend-react
npm run build
```

Should complete with exit code 0 (warnings are OK for now, but should be fixed).

---

### 4. Implement Phase 3.6-A — Backend Audit Log

**Goal:** Track who made changes using Supabase user identity.

#### Step 1: Add AuditLog Model to Database

**File:** `/root/chatwithmenu/Backend/python/db_models.py`

Add this model after existing models:

```python
class AuditLog(Base):
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey('restaurants.id'), nullable=False)
    menu_id = Column(Integer, ForeignKey('menus.id'), nullable=True)

    # User attribution (from Supabase JWT)
    actor_user_id = Column(String(255), nullable=False)
    actor_email = Column(String(255), nullable=False)

    # Event details
    action_type = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)

    # Change tracking
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    diff_summary = Column(Text, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
```

**Create the table:**

```python
from db_models import Base, create_all, engine
create_all(engine)
```

#### Step 2: Enable Audit Logging

**File:** `/root/chatwithmenu/Backend/python/audit_log.py`

Uncomment the database write section in `log_audit_event()` (around line 60).

#### Step 3: Add Auth Middleware to Protected Endpoints

**File:** `/root/chatwithmenu/Backend/python/server.py`

Add imports at top:

```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES
```

**Example: Protect menu import endpoint:**

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth  # Add this decorator
    def post(self, restaurant_id, menu_id):
        user = get_current_user()

        with GetDB() as db:
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... perform import logic ...

            # Log audit event
            log_audit_event(
                db=db,
                restaurant_id=restaurant_id,
                menu_id=menu_id,
                user_id=user.id,
                user_email=user.email,
                action_type=ACTION_TYPES['MENU_IMPORTED'],
                entity_type='menu',
                entity_id=menu_id,
                before_json={'menu_data': before_snapshot},
                after_json={'menu_data': menu.menu_data},
                metadata_json={'import_mode': 'replace', 'item_count': len(items)}
            )

            return {'success': True}
```

#### Step 4: Add Logging to All Write Endpoints

Add `@require_auth` and audit logging to:

**Menu operations:**
- Menu import → `MENU_IMPORTED`
- Menu save → `MENU_SAVED`
- Menu create → `MENU_CREATED`
- Menu delete → `MENU_DELETED`
- Menu rename → `MENU_RENAMED`

**Item operations:**
- Item update → `ITEM_UPDATED`
- Mark reviewed → `ITEM_MARK_REVIEWED`

**Bulk operations:**
- Bulk review category → `BULK_REVIEW_CATEGORY`
- Bulk review menu → `BULK_REVIEW_MENU`

#### Step 5: Add Test Endpoint

Add `/api/me` endpoint to test JWT auth:

```python
@api_namespace.route('/me')
class MeResource(Resource):
    @require_auth
    def get(self):
        user = get_current_user()
        return {
            'user_id': user.id,
            'email': user.email
        }
```

**Test with curl:**
```bash
# Get token from frontend after login
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/me
```

#### Step 6: Write Tests

Add tests for:
- Auth middleware (valid/invalid tokens)
- Audit logging (check database entries)
- /api/me endpoint

---

## Acceptance Criteria

✅ **Database:**
- `audit_log` table exists with all columns
- Indexes created (restaurant_id, menu_id, actor_user_id, created_at)

✅ **Authentication:**
- `@require_auth` works on protected endpoints
- `/api/me` returns user info from JWT
- Invalid tokens return 401

✅ **Audit Logging:**
- All write operations create audit log entries
- `actor_user_id` and `actor_email` populated from JWT
- `before_json` and `after_json` captured for undo
- `diff_summary` is human-readable

✅ **Testing:**
- Unit tests pass
- Manual database queries show audit entries
- No performance degradation

---

## Files to Modify

1. ✅ `db_models.py` - Add AuditLog model
2. ✅ `audit_log.py` - Uncomment database write
3. ✅ `server.py` - Add @require_auth + audit logging to endpoints
4. Create: Unit tests for auth and audit

**Helper files already created:**
- ✅ `auth_middleware.py` - JWT verification decorator
- ✅ `supabase_client.py` - Supabase connection
- ✅ `audit_log.py` - Audit logging functions

---

## Detailed Implementation Guide

See: `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md`

This file has:
- Step-by-step instructions
- Code examples for each endpoint
- Testing procedures
- Common issues and fixes

---

## After Phase 3.6-A

Once audit logging is complete and tested:

1. **Phase 3.6-B:** Frontend History Drawer UI
   - Show audit logs in MenuManager
   - Filter by action type
   - Display user and timestamp

2. **Phase 3.6-C:** Undo Functionality
   - Restore from `before_json` snapshots
   - Time-limited (1 hour)
   - Undo creates new audit entry

3. **Phase 3.6-D:** Role-Based Permissions
   - Store roles (owner/manager/server)
   - Check roles before operations
   - Servers view-only

---

## Deployment Rule (Important)

**ALWAYS deploy with:**
```bash
cd /root/cwm-frontend-react
./deploy.sh
```

**Never:**
- ❌ Manual `rsync` or `cp` to `/var/www/html/`
- ❌ Deploy without running build first
- ❌ Deploy if build exits non-zero
- ❌ Deploy without verifying artifacts

---

## ESLint Warnings (Optional, But Recommended)

See: `/root/cwm-frontend-react/ESLINT_WARNINGS.md`

19 warnings to fix (unused imports, missing dependencies).

**NOT blocking Phase 3.6-A**, but should be fixed to:
- Prevent `CI=true` build failures
- Clean up codebase
- Avoid surprises in CI/CD

---

## Questions?

If anything is unclear:
1. Read `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md`
2. Read `/root/cwm-frontend-react/SUPABASE_INTEGRATION_GUIDE.md`
3. Test connection: `python supabase_client.py`

---

## Estimated Time

- Environment setup + testing: 30 minutes
- Database model + table: 30 minutes
- Auth middleware integration: 1 hour
- Audit logging for all endpoints: 2-3 hours
- Testing: 1 hour

**Total: ~4-6 hours**

---

## Summary

1. ✅ Update `.env` files with real rotated keys
2. ✅ Test backend connection (`python supabase_client.py`)
3. ✅ Always deploy with `./deploy.sh`
4. ✅ Implement Phase 3.6-A (audit log backend)
   - Add AuditLog model
   - Enable audit logging
   - Add @require_auth to endpoints
   - Log all write operations
   - Write tests

**Next:** 3.6-B (History UI) → 3.6-C (Undo) → 3.6-D (Permissions)

Good luck! This is the foundation for audit, accountability, and trust.
