# Phase 3.6-A Verification Checklist

## ✅ Critical Error Fixed

**Problem:** Frontend `.env` had JWT string instead of publishable key
**Status:** ✅ FIXED - Now has `YOUR_ANON_KEY_HERE`

---

## Junior Dev: Run These Tests (In Order)

### 0. Pre-Flight Check

**Frontend .env:**
```bash
cat /root/cwm-frontend-react/.env
```

Must show:
```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

**Backend .env:**
```bash
cat /root/chatwithmenu/Backend/python/.env
```

Must have:
```
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

⚠️ Replace `YOUR_SERVICE_ROLE_KEY_HERE` with real key from Dashboard → Settings → API → service_role

---

### 1. Backend Connection Test

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
- Check backend `.env` has real service role key (not placeholder)
- Check no typos in URL or key

**Status:** ☐ Pass ☐ Fail

---

### 2. Frontend Login Test

**Steps:**
1. Start frontend dev server (if not running):
   ```bash
   cd /root/cwm-frontend-react
   npm start
   ```

2. Open browser to your app

3. Perform login/signup

4. Open browser console (F12)

5. Run:
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
        id: "xxx-xxx-xxx",
        email: "user@example.com"
      }
    }
  }
}
```

**If no session:**
- Check `REACT_APP_SUPABASE_ANON_KEY` is anon key format (not a JWT token)
- Check browser console for CORS errors
- Restart dev server after `.env` change

**Status:** ☐ Pass ☐ Fail

---

### 3. Backend JWT Verification Test

**Get JWT token from browser:**

In browser console (after successful login):
```javascript
const session = await supabase.auth.getSession();
console.log(session.data.session.access_token);
```

Copy the JWT token

**Test backend `/api/me` endpoint:**

```bash
# Replace YOUR_JWT_TOKEN with token from browser
curl -s -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/me
```

**Expected response (200 OK):**
```json
{
  "user_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "user@example.com"
}
```

**Also test failure cases:**

No token (should return 401):
```bash
curl -s http://localhost:5000/api/me
```

Invalid token (should return 401):
```bash
curl -s -H "Authorization: Bearer invalid_token" http://localhost:5000/api/me
```

**Status:** ☐ Pass ☐ Fail

---

### 4. Security Check

**Run these commands (should NOT print secrets):**

```bash
# Check .env is in .gitignore
cd /root/cwm-frontend-react
git status | grep .env
# Should show nothing (if .env is properly ignored)

cd /root/chatwithmenu/Backend/python
git status | grep .env
# Should show nothing

# Verify no secrets in frontend build
cd /root/cwm-frontend-react
npm run build 2>&1 | grep -i "sb_secret"
# Should show nothing

# Check no secrets in git history
git log --all --full-history --source --oneline -- '*.env' | head -5
# Should show nothing or only .gitignore changes
```

**Status:** ☐ Pass ☐ Fail

---

### 5. Database Check (Should Still Be SQLite)

```bash
cd /root/chatwithmenu/Backend/python
grep "connection_string" server.py
```

**Expected output:**
```python
connection_string = 'sqlite:///localdata.db'
```

**NOT:**
```python
connection_string = 'postgresql://...'  # This would be wrong
```

**Verify SQLite database exists:**
```bash
ls -lh /root/chatwithmenu/Backend/python/localdata.db
```

Should show existing database file.

**Status:** ☐ Pass ☐ Fail

---

## Acceptance Criteria Summary

Before proceeding to Phase 3.6-A implementation:

### Frontend ✅
- [ ] `.env` has anon key (NOT a JWT token)
- [ ] Login works in browser
- [ ] `supabase.auth.getSession()` returns session with JWT

### Backend ✅
- [ ] `.env` has service role key (real, not placeholder)
- [ ] `python supabase_client.py` succeeds
- [ ] `/api/me` with JWT returns user info (200)
- [ ] `/api/me` without token returns 401
- [ ] `/api/me` with invalid token returns 401

### Security ✅
- [ ] No service role key in frontend `.env` or code
- [ ] No keys printed in logs
- [ ] `.env` files not in git (check `git status`)

### Database ✅
- [ ] Still using SQLite (`connection_string = 'sqlite:///localdata.db'`)
- [ ] `localdata.db` file exists

---

## Report Back

**After running all tests, report status:**

```
Test 1 (Backend connection): ☐ Pass ☐ Fail
Test 2 (Frontend login): ☐ Pass ☐ Fail
Test 3 (JWT verification): ☐ Pass ☐ Fail
Test 4 (Security check): ☐ Pass ☐ Fail
Test 5 (Database check): ☐ Pass ☐ Fail

Issues encountered (if any):
[Describe any failures or errors]

Ready to proceed with Phase 3.6-A implementation: ☐ Yes ☐ No
```

---

## If All Tests Pass → Next Steps

### Phase 3.6-A Implementation (4-6 hours)

1. **Add AuditLog Model**
   - Edit: `/root/chatwithmenu/Backend/python/db_models.py`
   - Add `AuditLog` class (see `PHASE_3.6-A_IMPLEMENTATION.md`)

2. **Create Table in SQLite**
   ```bash
   cd /root/chatwithmenu/Backend/python
   source venv/bin/activate
   python -c "from db_models import Base, create_all, engine; create_all(engine)"
   ```

3. **Enable Audit Logging**
   - Edit: `/root/chatwithmenu/Backend/python/audit_log.py`
   - Uncomment database write section (line ~60-75)

4. **Protect Endpoints**
   - Edit: `/root/chatwithmenu/Backend/python/server.py`
   - Add imports: `from auth_middleware import require_auth, get_current_user`
   - Add `@require_auth` to all write endpoints
   - Call `log_audit_event()` after write operations

5. **Test Audit Logging**
   - Perform actions (import menu, edit item, etc.)
   - Check SQLite: `sqlite3 localdata.db "SELECT * FROM audit_log;"`
   - Verify `actor_user_id` and `actor_email` are populated

6. **Deploy**
   ```bash
   cd /root/cwm-frontend-react
   ./deploy.sh
   ```

**See:** `PHASE_3.6-A_IMPLEMENTATION.md` for detailed steps

---

## Troubleshooting

### Test 1 Fails (Backend Connection)
- Backend `.env` missing real service role key
- Typo in URL or key
- Network/firewall issue

### Test 2 Fails (Frontend Login)
- Frontend `.env` has wrong key (JWT instead of anon key)
- Dev server not restarted after `.env` change
- CORS issue (check browser console)

### Test 3 Fails (JWT Verification)
- Backend can't reach Supabase (network issue)
- Service role key incorrect
- `/api/me` endpoint not implemented or missing `@require_auth`

### Test 4 Fails (Security)
- `.env` not in `.gitignore`
- Secrets committed to git
- Need to remove from history: `git filter-branch` or BFG Repo-Cleaner

### Test 5 Fails (Database)
- SQLite connection string changed to Postgres (revert it)
- `localdata.db` missing (recreate with `create_all(engine)`)

---

## Key Reminders

### What Goes Where

| Item | Frontend | Backend | Notes |
|------|----------|---------|-------|
| Project URL | ✅ | ✅ | Same in both |
| Anon/Publishable Key | ✅ | ❌ | Anon key format |
| Service Role Key | ❌ | ✅ | Service role key format |
| JWT Tokens | Dynamic | Verifies | Generated on login |
| Database | N/A | SQLite | NO Postgres migration |

### Common Mistakes

❌ **Don't put JWT tokens in .env** → JWTs are generated on login
❌ **Don't put service role key in frontend** → Security risk
❌ **Don't migrate to Supabase Postgres** → Keep SQLite for Phase 3.6-A
❌ **Don't use direct DB connection** → Would fail on IPv4 anyway

✅ **Do use anon key in frontend** → Correct anon key
✅ **Do use service role key in backend only** → Admin access
✅ **Do keep SQLite for data** → Audit log goes into `localdata.db`
✅ **Do always deploy with `./deploy.sh`** → Hard gates protect production

---

**Good luck! Run all tests and report back before proceeding.**
