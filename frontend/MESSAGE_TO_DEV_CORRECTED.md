# Message to Junior Dev — Phase 3.6-A (Corrected)

## Subject: Supabase Auth Integration + Phase 3.6-A Go-Live (Read + Follow Exactly)

---

## ✅ Frontend Environment (Safe for Browser)

**File:** `/root/cwm-frontend-react/.env`

```bash
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

---

## ✅ Backend Environment (JWT Verification Only)

**File:** `/root/chatwithmenu/Backend/python/.env`

```bash
# Only need URL for JWT verification
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
```

**That's it. No service role key needed.**

---

## 🧠 Important: Service Role Key NOT Needed

### Why No Service Role Key?

**Our backend goal:**
- ✅ Verify Supabase JWT tokens
- ✅ Write audit logs to SQLite

**Service role key is ONLY for:**
- ❌ Admin queries to Supabase DB
- ❌ Bypassing Row Level Security
- ❌ Direct Supabase table operations

**We are NOT:**
- ❌ Migrating DB to Supabase Postgres
- ❌ Querying Supabase tables
- ❌ Doing admin DB operations

**Therefore:** Service role key not needed for Phase 3.6-A.

**When you WOULD need it:**
- If we migrate to Supabase Postgres later
- If we query Supabase tables as admin
- **Not now.**

---

## 🧪 Verification Steps (Must Pass)

### Step 1: Frontend Login Works

**In browser:**
1. Open app
2. Login or signup
3. Open console (F12)
4. Run:
   ```javascript
   await supabase.auth.getSession()
   ```

**Expected:**
```javascript
{
  data: {
    session: {
      access_token: "JWT_TOKEN_HERE",
      user: { id: "xxx", email: "user@example.com" }
    }
  }
}
```

**If session exists → Frontend connected ✅**

**Copy the `access_token` for next step.**

---

### Step 2: Backend JWT Verification Works

**Test with JWT from Step 1:**

```bash
# Replace JWT_TOKEN with actual token from browser
curl -H "Authorization: Bearer JWT_TOKEN" http://localhost:5000/api/me
```

**Expected (200 OK):**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**If you get user info → Backend auth works ✅**

**This is the real confirmation that Supabase JWT verification is working.**

**Also test failures (should return 401):**
```bash
curl http://localhost:5000/api/me
curl -H "Authorization: Bearer invalid_token" http://localhost:5000/api/me
```

---

### Step 3: Security Checks

```bash
# .env not in git
cd /root/cwm-frontend-react
git status | grep .env  # Should be empty

cd /root/chatwithmenu/Backend/python
git status | grep .env  # Should be empty

# No secrets in frontend
grep -r "sb_secret" /root/cwm-frontend-react/src/  # Should be empty

# Still using SQLite
grep "connection_string" /root/chatwithmenu/Backend/python/server.py
# Should show: sqlite:///localdata.db
```

---

## ✅ If All Verification Passes → Implement Phase 3.6-A

### Implementation Tasks (4-6 hours)

1. **Add AuditLog model** to `db_models.py`
2. **Create table** in SQLite: `create_all(engine)`
3. **Enable audit logging** in `audit_log.py` (uncomment DB write)
4. **Add `@require_auth`** to all write endpoints in `server.py`
5. **Log events** after write operations:
   - MENU_IMPORTED
   - MENU_SAVED
   - MENU_CREATED / RENAMED / DELETED
   - ITEM_UPDATED
   - ITEM_MARK_REVIEWED
   - BULK_REVIEW_CATEGORY / BULK_REVIEW_MENU
6. **Test:** Check SQLite for audit entries with `actor_user_id` + `actor_email`
7. **Deploy:** `./deploy.sh`

### Example Endpoint (Menu Import)

```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES

@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth
    def post(self, restaurant_id, menu_id):
        user = get_current_user()  # From JWT

        with GetDB() as db:
            menu = db.query(db_models.Menu).get(menu_id)
            before_snapshot = menu.menu_data

            # ... import logic ...

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
                metadata_json={'import_mode': 'replace', 'item_count': len(items)}
            )

            return {'success': True}
```

---

## 🔐 Security Rules (Non-Negotiable)

- ✅ `.env` never committed to git
- ✅ No keys printed or logged
- ✅ No `sb_secret` in frontend ever
- ✅ Service role key not needed (don't add it unless we query Supabase DB)

---

## 📝 About IPv4 Warning (Not Blocking)

The Supabase screenshot warning about IPv4 compatibility:
- Only applies to **direct Postgres connection** (`db.<ref>.supabase.co:5432`)
- We are using **SQLite**, not Supabase Postgres
- **Not blocking Phase 3.6-A**

If we migrate to Supabase Postgres later, we'd use Session Pooler (IPv4 compatible).

---

## 📋 Acceptance Criteria

### Before Implementation:
- [ ] Frontend login works (session in browser)
- [ ] Backend JWT verification works (`/api/me` returns user)
- [ ] Security checks pass (no keys in git, no secrets in frontend)

### After Implementation:
- [ ] `audit_log` table exists in SQLite
- [ ] All write operations create audit entries
- [ ] Entries have `actor_user_id` and `actor_email` from JWT
- [ ] `before_json` / `after_json` captured for undo
- [ ] `diff_summary` human-readable
- [ ] Deployment successful via `./deploy.sh`

---

## 🎯 Summary

**What's needed:**
- Frontend: Anon key (already correct) ✅
- Backend: Only `SUPABASE_URL` (no service role key) ✅
- Database: SQLite (no migration) ✅

**What to do:**
1. Verify frontend login works
2. Verify backend JWT verification works
3. Implement Phase 3.6-A (audit log)
4. Test and deploy

**No blockers. Ready to begin.**

---

## 📚 Documentation

**For implementation:**
- `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md` - Detailed guide
- `CORRECTED_GO_LIVE_INSTRUCTIONS.md` - This corrected version

**Helper files (ready to use):**
- `auth_middleware.py` - JWT verification decorator
- `audit_log.py` - Audit logging functions
- `supabase_client.py` - Connection wrapper (only needed for admin DB ops)

---

Good luck! 🚀
