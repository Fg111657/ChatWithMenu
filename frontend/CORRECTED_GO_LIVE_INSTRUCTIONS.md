# CORRECTED: Phase 3.6-A Go-Live Instructions

## 🚨 Critical Correction: Service Role Key NOT Needed

**Previous error:** Instructions said to add `SUPABASE_SERVICE_ROLE_KEY` to backend
**Correct:** Service role key is NOT needed for JWT verification

---

## ✅ What You Actually Need

### Frontend (Correct)
```bash
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

✅ Safe for browser
✅ Correct project

### Backend (Corrected)
```bash
# Only need the URL for JWT verification
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
```

**That's it.** No service role key needed.

---

## 🧠 Why Service Role Key is NOT Needed

### Service Role Key is ONLY for:
- ❌ Direct Supabase DB queries as admin
- ❌ Bypassing Row Level Security (RLS)
- ❌ Admin operations on Supabase tables

### Phase 3.6-A Uses:
- ✅ JWT verification (uses public JWT secret/JWKS)
- ✅ SQLite database (not Supabase Postgres)
- ✅ Audit log in SQLite (not Supabase)

**We don't need service role key because:**
- Not querying Supabase DB
- Not bypassing RLS
- Only verifying JWT tokens (public operation)

---

## 🧪 Verification (Must All Pass)

### Test 1: Frontend Login Works

**In browser:**
1. Open app
2. Login or signup
3. Open console (F12)
4. Run:
   ```javascript
   await supabase.auth.getSession()
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

**If session exists with access_token → Frontend connected ✅**

**Copy the access_token for next test.**

---

### Test 2: Backend JWT Verification Works

**Test with real JWT from frontend:**

```bash
# Replace JWT_TOKEN with token from Test 1
curl -H "Authorization: Bearer JWT_TOKEN" http://localhost:5000/api/me
```

**Expected response (200 OK):**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**If you get user info → Backend auth works ✅**

**Also test failures (should return 401):**
```bash
# No token
curl http://localhost:5000/api/me

# Invalid token
curl -H "Authorization: Bearer invalid" http://localhost:5000/api/me
```

Both should return 401.

---

### Test 3: Security Check

```bash
# .env not committed
cd /root/cwm-frontend-react
git status | grep .env
# Should be empty

cd /root/chatwithmenu/Backend/python
git status | grep .env
# Should be empty

# No service role key in frontend
cd /root/cwm-frontend-react
grep -r "sb_secret" src/
# Should be empty

# Still using SQLite
cd /root/chatwithmenu/Backend/python
grep "connection_string" server.py
# Should show: sqlite:///localdata.db
```

---

## ✅ If All Tests Pass → Implement Phase 3.6-A

### Backend .env (Final)

**File:** `/root/chatwithmenu/Backend/python/.env`

```bash
# Only need URL for JWT verification
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co

# NOTE: Service role key NOT needed for JWT verification
# Only add if you need Supabase DB admin operations (not Phase 3.6-A)
```

---

## 🚀 Phase 3.6-A Implementation (4-6 hours)

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

    # User attribution (from JWT)
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
```

---

### Step 2: Create Table

```bash
cd /root/chatwithmenu/Backend/python
source venv/bin/activate
python -c "from db_models import Base, create_all, engine; create_all(engine)"
```

**Verify:**
```bash
sqlite3 localdata.db ".schema audit_log"
```

---

### Step 3: Enable Audit Logging

**File:** `audit_log.py`

Uncomment database write section in `log_audit_event()` (around line 60-75).

---

### Step 4: Protect Endpoints + Log Events

**File:** `server.py`

**Add imports:**
```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES
```

**Example endpoint:**
```python
@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth
    def post(self, restaurant_id, menu_id):
        user = get_current_user()

        with GetDB() as db:
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... import logic ...

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

**Add to all write endpoints:**
- MENU_IMPORTED, MENU_SAVED, MENU_CREATED, MENU_DELETED, MENU_RENAMED
- ITEM_UPDATED, ITEM_MARK_REVIEWED
- BULK_REVIEW_CATEGORY, BULK_REVIEW_MENU

---

### Step 5: Test Audit Log

**Perform action, then check:**
```bash
sqlite3 /root/chatwithmenu/Backend/python/localdata.db \
  "SELECT actor_email, action_type, diff_summary, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

**Expected:** Entries with `actor_user_id`, `actor_email` from JWT.

---

### Step 6: Deploy

```bash
cd /root/cwm-frontend-react
./deploy.sh
```

---

## 📋 Acceptance Criteria

### Authentication ✅
- [ ] Frontend login works (`supabase.auth.getSession()` returns session)
- [ ] Backend JWT verification works (`/api/me` returns user info)
- [ ] Unauthorized requests return 401

### Audit Logging ✅
- [ ] `audit_log` table exists in SQLite
- [ ] All write operations create entries
- [ ] `actor_user_id` and `actor_email` from JWT
- [ ] `before_json` / `after_json` captured
- [ ] `diff_summary` human-readable

### Security ✅
- [ ] No service role key in frontend or backend (not needed)
- [ ] No keys logged
- [ ] `.env` not committed

### Database ✅
- [ ] Still using SQLite (`connection_string = 'sqlite:///localdata.db'`)

---

## 🔑 Key Points

### What Changed from Previous Instructions:
- ❌ **Before:** "Add service role key to backend .env"
- ✅ **Now:** "Only need SUPABASE_URL, no service role key"

### Why:
- Service role key is for admin DB operations
- JWT verification uses public JWT secret/JWKS
- Phase 3.6-A uses SQLite, not Supabase DB
- No admin operations needed

### When You WOULD Need Service Role Key:
- If migrating to Supabase Postgres
- If querying Supabase tables as admin
- If bypassing RLS
- **Not for Phase 3.6-A**

---

## 📝 About IPv4 Warning

The Supabase screenshot warning about IPv4:
- Only applies to direct Postgres connection (`db.<ref>.supabase.co:5432`)
- Not relevant for Phase 3.6-A (using SQLite)
- Not blocking anything

---

## ✅ Summary

**What you need:**
- Frontend: `REACT_APP_SUPABASE_URL` + `REACT_APP_SUPABASE_ANON_KEY` ✅
- Backend: `SUPABASE_URL` only ✅
- Database: SQLite (`localdata.db`) ✅

**What you DON'T need:**
- ❌ Service role key (not for JWT verification)
- ❌ Supabase Postgres connection
- ❌ Direct DB connection string

**Verification:**
1. ✅ Frontend login works
2. ✅ Backend `/api/me` with JWT works
3. ✅ Security checks pass

**Then:** Implement Phase 3.6-A (audit log in SQLite)

---

**Everything is ready. No blockers. Start implementation.**
