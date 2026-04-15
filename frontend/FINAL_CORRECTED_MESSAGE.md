# Final Corrected Message to Junior Dev

## Subject: Supabase Auth Setup (No Service Role Key) + Phase 3.6-A Start

---

## ✅ Frontend .env (Browser-Safe)

**File:** `/root/cwm-frontend-react/.env`

```bash
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

---

## ✅ Backend JWT Verification — Choose ONE Approach

**File:** `/root/chatwithmenu/Backend/python/.env`

### Option A: JWKS (Recommended) ✅

```bash
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
```

**How it works:**
- Backend fetches public keys from: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/certs`
- Verifies JWT signature + issuer + audience + expiry
- ✅ No secrets needed
- ✅ Best practice (similar to OAuth2/OIDC)

### Option B: JWT Secret

```bash
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_JWT_SECRET=YOUR_JWT_SECRET_HERE
```

**Get JWT Secret from:**
- Dashboard → Settings → API → **JWT Secret** (not service role!)

**How it works:**
- Backend verifies JWT locally with shared secret
- ✅ No service role key needed
- ⚠️ Secret must be protected like a password

---

## 🚨 What NOT to Use

### ❌ Service Role Key

**DO NOT use for JWT verification.**

**Service role key is ONLY for:**
- Admin operations on Supabase DB
- Bypassing Row Level Security (RLS)
- Direct Supabase table queries

**We are NOT doing any of that in Phase 3.6-A.**

---

## 🧪 Verification Sequence (Must Pass)

### Step 1: Frontend Login

**In browser after login:**
```javascript
await supabase.auth.getSession()
```

**Expected:** Session object with `access_token`

**Copy the `access_token` for next test.**

---

### Step 2: Backend JWT Verification (THE REAL TEST)

```bash
# Replace JWT_TOKEN with token from Step 1
curl -H "Authorization: Bearer JWT_TOKEN" http://localhost:5000/api/me
```

**Expected response (200 OK):**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**If this works → Backend JWT verification is correctly configured ✅**

**Also test failures (should return 401):**
```bash
curl http://localhost:5000/api/me
curl -H "Authorization: Bearer invalid_token" http://localhost:5000/api/me
```

---

## 🚀 If Verification Passes → Implement Phase 3.6-A

### Tasks (4-6 hours)

1. **Add AuditLog model** to `/root/chatwithmenu/Backend/python/db_models.py`
2. **Create table** in SQLite:
   ```bash
   cd /root/chatwithmenu/Backend/python
   source venv/bin/activate
   python -c "from db_models import Base, create_all, engine; create_all(engine)"
   ```
3. **Protect endpoints** with `@require_auth` in `server.py`
4. **Log events** with `actor_user_id` + `actor_email` from JWT:
   - MENU_IMPORTED
   - MENU_SAVED
   - MENU_CREATED / RENAMED / DELETED
   - ITEM_UPDATED
   - ITEM_MARK_REVIEWED
   - BULK_REVIEW_CATEGORY / BULK_REVIEW_MENU
5. **Test:** Check SQLite for audit entries
6. **Deploy:** `./deploy.sh`

### Example Endpoint

```python
from auth_middleware import require_auth, get_current_user
from audit_log import log_audit_event, ACTION_TYPES

@api_namespace.route('/restaurant/<int:restaurant_id>/menu/<int:menu_id>/import')
class MenuImportResource(Resource):
    @require_auth
    def post(self, restaurant_id, menu_id):
        user = get_current_user()  # User from JWT

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
- ✅ No `sb_secret` anywhere in frontend
- ✅ JWT Secret (if used) protected like a password

---

## 📋 Acceptance Criteria

### Verification (Before Implementation):
- [ ] Frontend login works (session with access_token)
- [ ] Backend `/api/me` with JWT returns user info (200)
- [ ] Backend `/api/me` without JWT returns 401
- [ ] Backend `/api/me` with invalid JWT returns 401

### Implementation (After Phase 3.6-A):
- [ ] `audit_log` table exists in SQLite
- [ ] All write operations create audit entries
- [ ] Entries have `actor_user_id` and `actor_email` from JWT
- [ ] `before_json` / `after_json` captured for undo
- [ ] `diff_summary` human-readable
- [ ] Deployment successful via `./deploy.sh`

---

## 🎯 Summary

**Frontend:**
- Anon key ✅

**Backend JWT verification (choose one):**
- JWKS (recommended): Only need `SUPABASE_URL` ✅
- JWT Secret: Need `SUPABASE_URL` + `SUPABASE_JWT_SECRET` ✅

**What NOT to use:**
- ❌ Service role key (not for JWT verification)

**Database:**
- ✅ SQLite (no migration to Supabase Postgres)

**Next steps:**
1. Verify frontend login
2. Verify backend JWT verification
3. Implement Phase 3.6-A audit log
4. Deploy

**No blockers. Ready to begin.**

---

## 📚 Documentation

**Implementation guide:**
- `/root/chatwithmenu/Backend/python/PHASE_3.6-A_IMPLEMENTATION.md`

**Helper files (ready to use):**
- `jwt_verification.py` - JWT verification (JWKS + secret support)
- `auth_middleware.py` - `@require_auth` decorator
- `audit_log.py` - Audit logging functions

Good luck! 🚀
