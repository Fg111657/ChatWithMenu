# FINAL: Go-Live Instructions for Phase 3.6-A

## ✅ STATUS: Configuration Verified Correct

**Frontend:** ✅ Correct anon key, safe for browser
**Backend:** ⚠️ Needs real service role key (ONLY remaining blocker)
**Architecture:** ✅ Locked and sound

---

## 🔴 BLOCKER: Add Real Backend Service Role Key

### Step 1: Get Key from Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR-PROJECT-ID/settings/api
2. Find: **Service role** key (secret)
3. Click to reveal/copy
4. Should be a JWT token string (JWT_TOKEN_HERE)

### Step 2: Update Backend .env

**File:** `/root/chatwithmenu/Backend/python/.env`

**Replace:**
```bash
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

**With:**
```bash
SUPABASE_SERVICE_ROLE_KEY=<PASTE_REAL_KEY_HERE>
```

### Rules (Non-Negotiable)
- ❌ Never log this key
- ❌ Never commit to git
- ❌ Never put in frontend
- ✅ Backend `.env` only

---

## 🧪 VERIFICATION: Run Tests in Order

### Test 1: Backend Supabase Connection

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

**If fails:** Service role key is wrong or missing

**Status:** ☐ Pass ☐ Fail

---

### Test 2: Frontend Auth (Browser)

```bash
# Start dev server if not running
cd /root/cwm-frontend-react
npm start
```

**In browser:**
1. Open app
2. Login or signup
3. Open console (F12)
4. Run:
   ```javascript
   supabase.auth.getSession()
   ```

**Expected output:**
```javascript
{
  data: {
    session: {
      access_token: "JWT_TOKEN_HERE",  // JWT token
      user: {
        id: "xxx",
        email: "user@example.com"
      }
    }
  }
}
```

**If fails:** Check frontend `.env` has correct anon key, restart dev server

**Status:** ☐ Pass ☐ Fail

---

### Test 3: Backend JWT Verification

**Get JWT token from browser console:**
```javascript
const session = await supabase.auth.getSession();
console.log(session.data.session.access_token);
// Copy the token
```

**Test backend endpoint:**
```bash
# Replace YOUR_JWT_TOKEN with token from browser
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/me
```

**Expected response (200 OK):**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**Also test failures (should return 401):**
```bash
# No token
curl http://localhost:5000/api/me

# Invalid token
curl -H "Authorization: Bearer invalid" http://localhost:5000/api/me
```

**Status:** ☐ Pass ☐ Fail

---

### Test 4: Security Sanity Checks

```bash
# .env files not tracked by git
cd /root/cwm-frontend-react
git status | grep .env
# Should be empty (if .env is properly ignored)

cd /root/chatwithmenu/Backend/python
git status | grep .env
# Should be empty

# No service role key in frontend
cd /root/cwm-frontend-react
grep -r "sb_secret" src/
# Should be empty

# Still using SQLite (not Supabase Postgres)
cd /root/chatwithmenu/Backend/python
grep "connection_string" server.py
# Should show: connection_string = 'sqlite:///localdata.db'
```

**Status:** ☐ Pass ☐ Fail

---

## ✅ ALL TESTS MUST PASS BEFORE CODING

**Report results:**
```
Test 1 (Backend connection): ☐ Pass ☐ Fail
Test 2 (Frontend auth): ☐ Pass ☐ Fail
Test 3 (JWT verification): ☐ Pass ☐ Fail
Test 4 (Security checks): ☐ Pass ☐ Fail

Issues (if any):
[Describe problems encountered]

Ready to proceed: ☐ Yes ☐ No
```

---

## 🚀 PHASE 3.6-A: Implementation (After Tests Pass)

### Overview
- **Goal:** Track who made changes using Supabase user identity
- **Time:** 4-6 hours
- **Database:** SQLite (no migration)
- **Scope:** Backend only (no frontend changes yet)

### Step 1: Add AuditLog Model

**File:** `/root/chatwithmenu/Backend/python/db_models.py`

Add after existing models:

```python
from datetime import datetime
from sqlalchemy import JSON

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

    # Change tracking (for undo)
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    diff_summary = Column(Text, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action_type} by {self.actor_email}>"
```

---

### Step 2: Create Table in SQLite

```bash
cd /root/chatwithmenu/Backend/python
source venv/bin/activate
python -c "from db_models import Base, create_all, engine; create_all(engine)"
```

**Verify table created:**
```bash
sqlite3 localdata.db ".schema audit_log"
```

Should show table structure.

---

### Step 3: Enable Audit Logging

**File:** `/root/chatwithmenu/Backend/python/audit_log.py`

Find the `log_audit_event()` function (around line 60).

**Uncomment the database write section:**

```python
def log_audit_event(...):
    # ... existing code ...

    # UNCOMMENT THIS SECTION:
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

### Step 4: Protect Endpoints + Add Logging

**File:** `/root/chatwithmenu/Backend/python/server.py`

**Add imports at top:**
```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES
```

**Example: Menu import endpoint**

```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth  # Add this decorator
    def post(self, restaurant_id, menu_id):
        user = get_current_user()  # Get authenticated user

        with GetDB() as db:
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... perform import logic ...
            # (your existing code)

            # After import, log audit event
            log_audit_event(
                db=db,
                restaurant_id=restaurant_id,
                menu_id=menu_id,
                user_id=user.id,         # From JWT
                user_email=user.email,    # From JWT
                action_type=ACTION_TYPES['MENU_IMPORTED'],
                entity_type='menu',
                entity_id=menu_id,
                before_json={'menu_data': before_snapshot},
                after_json={'menu_data': menu.menu_data},
                metadata_json={
                    'import_mode': 'replace',
                    'item_count': len(parsed_items)
                }
            )

            return {'success': True}
```

**Add to ALL write endpoints:**
- Menu import → `MENU_IMPORTED`
- Menu save → `MENU_SAVED`
- Menu create → `MENU_CREATED`
- Menu delete → `MENU_DELETED`
- Menu rename → `MENU_RENAMED`
- Item update → `ITEM_UPDATED`
- Mark reviewed → `ITEM_MARK_REVIEWED`
- Bulk review category → `BULK_REVIEW_CATEGORY`
- Bulk review menu → `BULK_REVIEW_MENU`

---

### Step 5: Test Audit Logging

**Perform an action** (e.g., import menu, edit item)

**Check audit log:**
```bash
cd /root/chatwithmenu/Backend/python
sqlite3 localdata.db "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

**Expected columns filled:**
- `actor_user_id` (Supabase UUID)
- `actor_email` (user email)
- `action_type` (e.g., MENU_IMPORTED)
- `diff_summary` (human-readable)
- `before_json` / `after_json` (for undo)
- `created_at` (timestamp)

**If audit log is empty:**
- Check endpoint has `@require_auth` decorator
- Check `log_audit_event()` is called after write
- Check database write is uncommented in `audit_log.py`
- Check backend logs for errors

---

### Step 6: Deploy

```bash
cd /root/cwm-frontend-react
./deploy.sh
```

Deployment script will:
- Build frontend (must succeed)
- Validate artifacts exist
- Deploy to `/var/www/html/`
- Verify production

---

## 📋 Phase 3.6-A Acceptance Criteria

### Database ✅
- [ ] `audit_log` table exists in SQLite
- [ ] Table has all required columns (actor_user_id, actor_email, etc.)

### Authentication ✅
- [ ] All write endpoints have `@require_auth` decorator
- [ ] Unauthorized requests return 401
- [ ] Valid JWT tokens are accepted

### Audit Logging ✅
- [ ] All write operations create audit entries
- [ ] `actor_user_id` and `actor_email` populated from JWT
- [ ] `before_json` and `after_json` captured for undo
- [ ] `diff_summary` is human-readable
- [ ] Timestamps are accurate

### Security ✅
- [ ] No service role key in frontend
- [ ] No keys logged or printed
- [ ] `.env` files not committed to git

### Performance ✅
- [ ] No noticeable slowdown from audit logging
- [ ] Database writes are fast

---

## 📚 Detailed Documentation

**For implementation steps:**
- `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md` - Detailed guide

**For reference:**
- `MESSAGE_TO_DEV_FINAL.md` - Complete setup
- `SUPABASE_IPV4_WARNING.md` - Database connection warning
- `MESSAGE_DEV_FIX_ANON_KEY.md` - Key types explained

**Helper files (already created):**
- `supabase_client.py` - Supabase connection
- `auth_middleware.py` - JWT verification
- `audit_log.py` - Audit logging functions

---

## 🎓 What We Avoided (Why This Architecture Matters)

### Common Mistakes We DIDN'T Make ✅
- ❌ Putting JWTs in `.env` → We use anon key (correct)
- ❌ Putting service role key in frontend → Backend only (correct)
- ❌ Migrating DB too early → SQLite works fine (correct)
- ❌ Using direct DB connection → IPv6 incompatible anyway (correct)

### What We Built Instead ✅
- ✅ Clean auth boundary (Supabase = auth, SQLite = data)
- ✅ Reversible architecture (can swap backends later)
- ✅ Auditability before undo (know who did what)
- ✅ Trust before scale (owners see changes)

This is **senior-level system design**, not MVP hacking.

---

## 🚦 Summary (What Happens Next)

### 1. BLOCKER (Do First)
- [ ] Add real service role key to backend `.env`

### 2. VERIFICATION (Must All Pass)
- [ ] Test 1: Backend connection
- [ ] Test 2: Frontend auth
- [ ] Test 3: JWT verification
- [ ] Test 4: Security checks

### 3. IMPLEMENTATION (4-6 hours)
- [ ] Add `AuditLog` model
- [ ] Create table in SQLite
- [ ] Enable audit logging
- [ ] Protect endpoints with `@require_auth`
- [ ] Add audit logging to all write operations
- [ ] Test and verify
- [ ] Deploy with `./deploy.sh`

### 4. AFTER PHASE 3.6-A
- Phase 3.6-B: Frontend History Drawer UI (2-3 days)
- Phase 3.6-C: Undo functionality (1-2 days)
- Phase 3.6-D: Role-based permissions (2-3 days)

---

## ✅ Ready to Begin

**Everything is correct. Only one blocker remains:**

🔴 Add real service role key to backend `.env`

**Then:** Run verification tests → Implement Phase 3.6-A → Deploy

Good luck! 🚀
