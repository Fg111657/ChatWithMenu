# Manual Verification Checklist - ChatWithMenu.com
**After Deploy:** 2026-01-18 19:40 UTC

---

## Pre-Test Setup

- [ ] Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- [ ] Open DevTools (F12)
- [ ] Go to Network tab → Check "Disable cache"
- [ ] Open Console tab (keep visible during tests)

---

## Test 1: Edit Profile Auth Fix (CRITICAL)

**Issue Fixed:** 401 Unauthorized on profile save

### Steps
1. [ ] Navigate to `https://chatwithmenu.com/edit-profile`
2. [ ] Make any change (e.g., update name or phone)
3. [ ] Click Save
4. [ ] **Network Tab → Find `modifyUser/52` request**

### Expected Results
- [ ] Request Headers show: `Authorization: Bearer eyJhbG...` (JWT token present)
- [ ] Response Status: `200 OK` (NOT 401)
- [ ] Success message appears in UI
- [ ] Console shows no errors

### If Test Fails
Capture screenshot of:
- Network tab showing request headers
- Response status and body
- Console errors

Then run backend log check:
```bash
sudo journalctl -u chatwithmenu-backend -n 30 | grep "modifyUser\|Token verification"
```

---

## Test 2: Menu Manager Crash Fix (CRITICAL)

**Issue Fixed:** `TypeError: p.map is not a function`

### Steps
1. [ ] Navigate to `https://chatwithmenu.com/menu-manager`
2. [ ] Wait for restaurant dropdown to load
3. [ ] Select any restaurant from dropdown
4. [ ] Check Menu Items tab loads
5. [ ] Click Specials tab
6. [ ] Click Upsell Tips tab
7. [ ] Click Restaurant Profile tab

### Expected Results
- [ ] No ErrorBoundary crash screen
- [ ] Restaurant dropdown shows list of restaurants
- [ ] Selecting restaurant shows menu content
- [ ] Menu Items tab shows categories and items (or "empty" message)
- [ ] Specials tab renders (may be empty)
- [ ] Upsell Tips tab renders (may be empty)
- [ ] Console shows: `[MenuManager] Default menu selected: {menuId: ..., menuName: ...}`
- [ ] Console has NO `p.map is not a function` errors

### If Test Fails
Capture screenshot of:
- Full screen showing crash or blank area
- Console errors (especially line numbers)
- Network tab showing `/api/listRestaurants` response

---

## Test 3: Dashboard Restaurant List (MEDIUM)

**Issue Prevented:** Same array crash protection

### Steps
1. [ ] Navigate to `https://chatwithmenu.com/dashboard`
2. [ ] Wait for restaurant cards to load
3. [ ] Try search/filter if available

### Expected Results
- [ ] Restaurant cards render
- [ ] No console errors
- [ ] Search/filter works (if implemented)

### If Test Fails
Check Console for `.map` errors on `restaurants` variable

---

## Test 4: Create Account with Invite Code (REGRESSION CHECK)

**Already Working - Verify Still Works**

### Steps
1. [ ] Navigate to `https://chatwithmenu.com/create-account`
2. [ ] Fill in email, password
3. [ ] Expand "Have an invite code?" section
4. [ ] Enter test invite code (if available)
5. [ ] Create account

### Expected Results
- [ ] Account creation succeeds
- [ ] Invite code applied correctly
- [ ] Redirected to dashboard or next step
- [ ] No errors

---

## Test 5: Edit Profile with Invite Code (NEW FUNCTIONALITY)

**Combined Fix - Auth + Invite Code**

### Steps
1. [ ] Log in as regular user (Diner account)
2. [ ] Navigate to `/edit-profile`
3. [ ] Expand "Have an invite code?" section
4. [ ] Enter merchant/server invite code
5. [ ] Save profile

### Expected Results
- [ ] Save succeeds (200 OK)
- [ ] Account type updates (if valid code)
- [ ] Success message shows upgrade confirmation
- [ ] No 401 errors

### If Test Fails
Check both:
- Auth headers (Test 1 steps)
- Backend logs for invite code validation errors

---

## Backend Health Check

Run these commands to verify backend stability:

```bash
# Check backend is running
sudo systemctl status chatwithmenu-backend

# Check for auth errors
sudo journalctl -u chatwithmenu-backend --since "30 minutes ago" | grep -i "401\|unauthorized\|token verification failed"

# Check for successful auth
sudo journalctl -u chatwithmenu-backend --since "30 minutes ago" | grep "authenticated user"

# Check for crashes
sudo journalctl -u chatwithmenu-backend --since "30 minutes ago" | grep -i "error\|exception" | tail -20
```

### Expected Results
- [ ] Backend status: `active (running)`
- [ ] No repeated "Token verification failed" errors
- [ ] Should see "authenticated user" entries after Edit Profile test
- [ ] No Python exceptions or crashes

---

## Performance Check

### CPU Usage
```bash
top -b -n 1 | grep python3
```

**Expected:** CPU < 60% (systemd CPUQuota=60%)

### Memory Usage
```bash
sudo systemctl show chatwithmenu-backend | grep Memory
```

**Expected:** Memory < 600M (systemd MemoryMax=600M)

---

## Rollback Trigger Conditions

**Rollback if ANY of these occur:**

- [ ] Edit Profile consistently returns 401 (auth fix failed)
- [ ] Menu Manager crashes with same error (normalization failed)
- [ ] New crashes appear on previously working routes
- [ ] CPU usage exceeds 60% sustained
- [ ] Memory usage exceeds 600M
- [ ] Backend service crashes/restarts repeatedly

**Do NOT rollback for:**
- Minor console warnings (eslint, etc.)
- Empty data displays (if restaurant has no menus)
- Slow network responses (that's separate)

---

## Success Criteria Summary

**Minimum (Must Pass):**
- ✅ Test 1 (Edit Profile) passes
- ✅ Test 2 (Menu Manager) passes
- ✅ Backend stable for 30 minutes post-test

**Ideal (Preferred):**
- All 5 tests pass
- No console errors on any route
- CPU/Memory within limits
- Backend logs clean

---

## Reporting Results

### If All Tests Pass
Document in `PRODUCTION_STABILIZATION_REPORT.md`:
```
## Manual Verification - PASSED
Date: 2026-01-18
Tester: [Name]

All critical tests passed:
- Edit Profile: 200 OK, JWT verified
- Menu Manager: No crashes, content loads
- Dashboard: Restaurant list renders
- Backend: Stable, no errors

Status: Production stabilization COMPLETE
```

### If Tests Fail
Capture:
1. Screenshot of error
2. Console log excerpt
3. Network tab response
4. Backend log snippet

**Do NOT:**
- Run another `npm run build` immediately
- Make random code changes
- Restart services repeatedly

**Do:**
- Document exact failure
- Review PRODUCTION_STABILIZATION_REPORT.md
- Consider rollback if critical

---

## Timeline Estimate

- **Setup:** 2 minutes
- **Test 1 (Auth):** 3 minutes
- **Test 2 (Menu Manager):** 4 minutes
- **Test 3 (Dashboard):** 2 minutes
- **Test 4-5 (Invite Codes):** 5 minutes
- **Backend Check:** 2 minutes
- **Total:** ~18 minutes

---

## Next Actions After Verification

1. **If tests pass:** Mark incident as resolved, monitor for 24h
2. **If tests fail:** Review logs, identify gap, do NOT rebuild yet
3. **Update documentation:** Mark checkboxes in this file
4. **Notify stakeholders:** Production stability status
