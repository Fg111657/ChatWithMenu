# Phase 3.6-A Implementation — Final Instructions

## 🎯 Goal
Connect Supabase for **Auth only** (JWT verification), keep using SQLite for data, implement audit logging.

---

## 🚨 Critical Warnings

### Security (Non-Negotiable)
- ❌ Never put service role key in frontend
- ❌ Never print keys in logs
- ✅ `.env` stays uncommitted (already in `.gitignore`)

### Database Connection (IPv4/IPv6 Issue)
- ⚠️ **Direct DB connection is NOT IPv4 compatible**
- ⚠️ If your server is IPv4-only (most are), direct connection WILL FAIL
- ✅ Use **Session Pooler** if you need database connection
- ✅ **For Phase 3.6-A:** Keep using SQLite (no migration needed)

**See:** `SUPABASE_IPV4_WARNING.md` for details

---

## 1️⃣ Confirm Supabase Project Details

### Project Info (Confirmed)
- **Project URL:** `https://YOUR-PROJECT-ID.supabase.co`
- **Project Ref:** `YOUR-PROJECT-ID`

### Auth API (What We're Using)
- Frontend: `REACT_APP_SUPABASE_ANON_KEY` (public, safe)
- Backend: `SUPABASE_SERVICE_ROLE_KEY` (secret, backend-only)

### Database Connection (NOT USING FOR PHASE 3.6-A)
- **Current:** SQLite (`localdata.db`) ✅
- **Optional Later:** Supabase Postgres via Session Pooler
- **Direct DB:** `db.YOUR-PROJECT-ID.supabase.co:5432` (requires IPv6)
- **Session Pooler:** Get from Dashboard → Database → Connection Pooling

---

## 2️⃣ Frontend Setup (React) — Auth Only

### Update .env file

**File:** `/root/cwm-frontend-react/.env`

```bash
DANGEROUSLY_DISABLE_HOST_CHECK=true

# Supabase Auth (FRONTEND ONLY - Anon Key)
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Get anon key from:** https://supabase.com/dashboard/project/YOUR-PROJECT-ID/settings/api

### Install Dependencies

```bash
cd /root/cwm-frontend-react
npm install @supabase/supabase-js
```

### Client Already Created

**File:** `/root/cwm-frontend-react/src/services/supabaseClient.js`

Already exists with correct setup. No changes needed.

### Frontend Verification

**Test in browser:**
1. Login/signup works
2. After login: `supabase.auth.getSession()` returns a session
3. No CORS or invalid key errors

---

## 3️⃣ Backend Setup (Flask) — JWT Verification Only

### Update .env file

**File:** `/root/chatwithmenu/Backend/python/.env`

```bash
# Supabase Auth (BACKEND ONLY - Service Role Key)
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Database Connection (KEEP USING SQLITE FOR PHASE 3.6-A)
# No change needed - server.py already uses: sqlite:///localdata.db
```

**Get service role key from:** Dashboard → Settings → API → `service_role` (secret)

### Dependencies Already Installed

```bash
cd /root/chatwithmenu/Backend/python
source venv/bin/activate
# Already installed: supabase, python-dotenv, pyjwt
```

### Backend Verification Step 1: Client Init

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

**If fails:**
- Check `.env` has real keys (not placeholders)
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Ensure venv is activated

### Backend Verification Step 2: JWT Verify

**Add test endpoint to `server.py`:**

```python
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
```

**Test with curl:**
```bash
# Get JWT token from frontend after login
# Token is in: supabase.auth.getSession().data.session.access_token

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/me
```

**Expected response:**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

---

## 4️⃣ Database Connection (SKIP FOR PHASE 3.6-A)

### Current State: Using SQLite ✅

**File:** `/root/chatwithmenu/Backend/python/server.py`

```python
connection_string = 'sqlite:///localdata.db'  # Keep this!
```

**Phase 3.6-A uses SQLite for:**
- Restaurants
- Menus
- **NEW:** Audit log (add `AuditLog` model to `db_models.py`)

### Future Migration (Optional)

**If you decide to migrate to Supabase Postgres later:**

1. **Check IPv4/IPv6 support** (see `SUPABASE_IPV4_WARNING.md`)
2. **Get Session Pooler URI** (Dashboard → Database → Connection Pooling)
3. **Test with psql:**
   ```bash
   psql "postgresql://postgres:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -c "SELECT NOW();"
   ```
4. **If pooler works, update `.env`:**
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**DO NOT DO THIS FOR PHASE 3.6-A.** Keep using SQLite.

---

## 5️⃣ Implement Phase 3.6-A — Audit Log Backend

### Database: Add AuditLog Model

**File:** `/root/chatwithmenu/Backend/python/db_models.py`

Add after existing models:

```python
from datetime import datetime

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

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action_type} by {self.actor_email}>"
```

**Create table:**

```python
from db_models import Base, create_all, engine
create_all(engine)
```

Or run from Python shell:
```bash
cd /root/chatwithmenu/Backend/python
source venv/bin/activate
python -c "from db_models import Base, create_all, engine; create_all(engine)"
```

### Enable Audit Logging

**File:** `/root/chatwithmenu/Backend/python/audit_log.py`

Uncomment the database write section in `log_audit_event()` (around line 60-75).

### Add Auth + Audit to Endpoints

**File:** `/root/chatwithmenu/Backend/python/server.py`

**Add imports:**
```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES
```

**Protect endpoints with @require_auth:**

Example for menu import:
```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth  # Add this
    def post(self, restaurant_id, menu_id):
        user = get_current_user()  # Get authenticated user

        with GetDB() as db:
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... perform import logic ...

            # Log audit event
            log_audit_event(
                db=db,
                restaurant_id=restaurant_id,
                menu_id=menu_id,
                user_id=user.id,          # From JWT
                user_email=user.email,     # From JWT
                action_type=ACTION_TYPES['MENU_IMPORTED'],
                entity_type='menu',
                entity_id=menu_id,
                before_json={'menu_data': before_snapshot},
                after_json={'menu_data': menu.menu_data},
                metadata_json={'import_mode': 'replace', 'item_count': len(items)}
            )

            return {'success': True}
```

**Add to all write endpoints:**
- Menu import → `MENU_IMPORTED`
- Menu save → `MENU_SAVED`
- Menu create → `MENU_CREATED`
- Menu delete → `MENU_DELETED`
- Item update → `ITEM_UPDATED`
- Mark reviewed → `ITEM_MARK_REVIEWED`
- Bulk review → `BULK_REVIEW_CATEGORY` or `BULK_REVIEW_MENU`

**See full guide:** `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md`

---

## 6️⃣ Testing

### Test 1: Auth Works
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/me
```

Should return user info.

### Test 2: Audit Log Created

After performing an action (e.g., menu import), check database:

```bash
sqlite3 /root/chatwithmenu/Backend/python/localdata.db "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

Should show audit entries with:
- `actor_user_id` (Supabase UUID)
- `actor_email` (user email)
- `action_type`
- `diff_summary`

### Test 3: Unauthorized Access Blocked

```bash
curl http://localhost:5000/api/me
# Should return 401 (no token)

curl -H "Authorization: Bearer invalid_token" http://localhost:5000/api/me
# Should return 401 (invalid token)
```

---

## 7️⃣ Acceptance Criteria

### Authentication ✅
- [ ] Frontend can login via Supabase (session exists)
- [ ] Backend `/api/me` endpoint works with valid JWT
- [ ] Invalid/missing tokens return 401

### Audit Logging ✅
- [ ] `audit_log` table exists in SQLite
- [ ] All write operations create audit entries
- [ ] `actor_user_id` and `actor_email` populated from JWT
- [ ] `before_json` and `after_json` captured for undo
- [ ] `diff_summary` is human-readable

### Security ✅
- [ ] No secrets in frontend repo
- [ ] No keys logged or printed
- [ ] `.env` files not committed

### Database ✅
- [ ] Still using SQLite (`localdata.db`)
- [ ] No migration to Supabase Postgres (optional for later)

---

## 8️⃣ Common Issues

### Issue 1: "Name or service not known"
**Cause:** Keys are placeholders, not real
**Fix:** Get real keys from Supabase dashboard and update `.env` files

### Issue 2: "401 Unauthorized"
**Cause:** JWT token not sent or invalid
**Fix:** Frontend must send token in `Authorization: Bearer <token>` header

### Issue 3: "Direct DB connection fails"
**Cause:** Server is IPv4-only, Supabase direct requires IPv6
**Fix:** Use Session Pooler (BUT NOT NEEDED FOR PHASE 3.6-A - keep using SQLite)

### Issue 4: "audit_log table doesn't exist"
**Cause:** Table not created
**Fix:** Run `create_all(engine)` or manually create table

---

## 9️⃣ Files Modified/Created

### Already Created ✅
- `/root/chatwithmenu/Backend/python/supabase_client.py`
- `/root/chatwithmenu/Backend/python/auth_middleware.py`
- `/root/chatwithmenu/Backend/python/audit_log.py`
- `/root/cwm-frontend-react/src/services/supabaseClient.js`
- `/root/cwm-frontend-react/deploy.sh`

### Need to Modify 📝
- `/root/chatwithmenu/Backend/python/db_models.py` - Add AuditLog model
- `/root/chatwithmenu/Backend/python/audit_log.py` - Uncomment database write
- `/root/chatwithmenu/Backend/python/server.py` - Add @require_auth + audit logging
- `/root/chatwithmenu/Backend/python/.env` - Add real keys
- `/root/cwm-frontend-react/.env` - Add real keys

---

## 🔟 Summary (Step-by-Step)

1. ✅ Update `.env` files with real Auth keys (anon + service role)
2. ✅ Test backend connection: `python supabase_client.py`
3. ✅ Add AuditLog model to `db_models.py`
4. ✅ Create audit_log table: `create_all(engine)`
5. ✅ Uncomment database write in `audit_log.py`
6. ✅ Add `@require_auth` to endpoints in `server.py`
7. ✅ Add audit logging after all write operations
8. ✅ Add `/api/me` test endpoint
9. ✅ Test: Auth works, audit entries created
10. ✅ Always deploy with: `./deploy.sh`

---

## 📚 Documentation

- **This file:** Complete setup + implementation
- **IPv4 warning:** `SUPABASE_IPV4_WARNING.md`
- **Detailed guide:** `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md`
- **Integration guide:** `SUPABASE_INTEGRATION_GUIDE.md`

---

## ⏱️ Estimated Time

- Environment setup + testing: **30 min**
- Database model + table: **30 min**
- Auth middleware integration: **1 hour**
- Audit logging for all endpoints: **2-3 hours**
- Testing: **1 hour**

**Total: 4-6 hours**

---

## 🚀 After Phase 3.6-A

Once audit backend is complete:

1. **Phase 3.6-B:** Frontend History Drawer UI (2-3 days)
2. **Phase 3.6-C:** Undo functionality (1-2 days)
3. **Phase 3.6-D:** Role-based permissions (2-3 days)

---

## ✅ Ready to Begin

All infrastructure, helper files, and documentation are ready. Just need to:
1. Add real keys to `.env` files
2. Test connection
3. Follow implementation steps

Good luck!
