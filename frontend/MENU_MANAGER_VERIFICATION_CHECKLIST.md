# Menu Manager Manual Verification Checklist
**Deploy Time:** 2026-01-18 20:55 UTC
**Target:** https://chatwithmenu.com/menu-manager

---

## ⚠️ IMPORTANT: Do NOT Call This "Complete" Until:

You personally open `/menu-manager` on **chatwithmenu.com** with DevTools open and confirm:

1. ✅ `/api/listRestaurants` returns **200 OK**
2. ✅ **No ErrorBoundary** crash screen
3. ✅ **No `.map is not a function`** error in console
4. ✅ All tabs render without crashes

---

## Pre-Test Setup (1 minute)

- [ ] Open Chrome/Firefox in Incognito/Private mode (fresh session)
- [ ] Navigate to `https://chatwithmenu.com/menu-manager`
- [ ] Open DevTools: `F12` or `Cmd+Option+I` (Mac)
- [ ] Switch to **Console tab** - keep visible
- [ ] Switch to **Network tab** - check "Disable cache"
- [ ] Refresh page: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

---

## Test 1: Restaurant Dropdown Load (CRITICAL - 3 min)

**Target:** Line 1236 crash (`restaurants.map`)

### Steps
1. [ ] Page loads at `/menu-manager`
2. [ ] Look for restaurant dropdown (should say "Select Restaurant")

### Check Console
- [ ] No red error messages
- [ ] Specifically NO: `TypeError: p.map is not a function`
- [ ] Specifically NO: `restaurants.map is not a function`

### Check Network Tab
1. [ ] Find request: `GET /api/listRestaurants`
2. [ ] Click on it → Preview/Response tab
3. [ ] Verify response structure:
   ```json
   {
     "restaurants": [
       {"id": X, "name": "..."},
       ...
     ]
   }
   ```
4. [ ] Status: **200 OK** (not 401, not 500)

### Expected UI Behavior
- [ ] Restaurant dropdown **populated with options**
- [ ] No ErrorBoundary crash screen
- [ ] No blank white screen

### If Test Fails
**Capture:**
1. Screenshot of console showing exact error
2. Screenshot of Network tab showing `/api/listRestaurants` response
3. Note: Is dropdown empty or crashed?

**Stop here** - do not proceed to other tests if this fails.

---

## Test 2: Restaurant Selection & Menu Load (4 min)

**Target:** Menu data normalization

### Steps
1. [ ] Click restaurant dropdown
2. [ ] Select **any restaurant** from list
3. [ ] Wait 2-3 seconds for menu data to load

### Check Console
- [ ] No errors appear
- [ ] Look for: `[MenuManager] Default menu selected: {menuId: ..., menuName: "..."}`

### Check Network Tab
1. [ ] Find request: `GET /api/restaurant/{id}` (id will be a number)
2. [ ] Status: **200 OK**
3. [ ] Response contains: `"menus": [...]` or `"menus": []`

### Expected UI Behavior

**If restaurant HAS menus:**
- [ ] Menu Items tab shows categories
- [ ] Categories contain items (or show "No items")
- [ ] No crash, no ErrorBoundary

**If restaurant has NO menus:**
- [ ] Shows message: "No menus found" or similar empty state
- [ ] **No crash** - empty state is correct behavior

### If Test Fails
**Capture:**
1. Console error (exact message and line number)
2. Network response for `/api/restaurant/{id}`
3. Screenshot showing crash or blank screen

---

## Test 3: Tab Navigation Safety (3 min)

**Target:** All tabs render without crashing on empty data

### Steps
1. [ ] With restaurant selected, click **Specials** tab
2. [ ] Wait 1 second, check console
3. [ ] Click **Upsell Tips** tab
4. [ ] Wait 1 second, check console
5. [ ] Click **Restaurant Profile** tab
6. [ ] Wait 1 second, check console
7. [ ] Click back to **Menu Items** tab

### Expected Results
- [ ] All tabs load without crashing
- [ ] Empty tabs show **empty state messages** (not crashes)
- [ ] Console remains clean (no errors)

### If Any Tab Crashes
**Capture:**
1. Which tab crashed?
2. Console error message
3. Was data empty or malformed?

---

## Test 4: Add/Edit Menu Item (4 min)

**Target:** Nested map protection (lines 812-817)

### Steps
1. [ ] Select restaurant with at least one menu
2. [ ] Select a category (or create one if needed)
3. [ ] Click "Add Item" button
4. [ ] Fill in item name: "Test Item"
5. [ ] Fill in price: "10"
6. [ ] Click Save

### Check Console During Save
- [ ] No errors during save operation
- [ ] No `c.items.map is not a function`
- [ ] No `TypeError` related to items array

### Expected Results
- [ ] Item appears in the list
- [ ] No crash
- [ ] Success message or feedback

### Special Case Test (If Possible)
Try adding an item to a **brand new category** that has never had items:
- [ ] Does it crash? (Should NOT - we guard for this)

### If Test Fails
**Capture:**
1. Console error (especially if mentions `items`)
2. Note: Was this a new category with no prior items?

---

## Test 5: Mark Items Reviewed (3 min)

**Target:** Review flow nested map (line 1008)

### Steps
1. [ ] Select a menu with items
2. [ ] Look for any items with "Needs Review" badge/indicator
3. [ ] If found, click "Mark Reviewed" or similar button
4. [ ] Check console during operation

### Expected Results
- [ ] Items update without crash
- [ ] Review status changes
- [ ] No `items.map` errors

### If No "Needs Review" Items
- [ ] Skip this test - not critical if data doesn't have review flags

### If Test Fails
**Capture:**
1. Console error
2. Note: Which items were being reviewed?

---

## Backend Health Check (2 min)

After completing UI tests, verify backend stability:

```bash
# Check backend is running
sudo systemctl status chatwithmenu-backend

# Check for new errors since deploy
sudo journalctl -u chatwithmenu-backend --since "20:55" | grep -i "error\|exception" | tail -20

# Confirm no crashes
sudo journalctl -u chatwithmenu-backend --since "20:55" | grep -i "exit\|stopped"
```

### Expected
- [ ] Backend status: `active (running)`
- [ ] No new Python exceptions
- [ ] No service restarts since 20:55 UTC

---

## Performance Check (1 min)

```bash
# CPU usage
top -b -n 1 | grep python3

# Memory usage
sudo systemctl show chatwithmenu-backend | grep Memory
```

### Expected
- [ ] CPU < 60% (within CPUQuota)
- [ ] Memory < 600M (within MemoryMax)

---

## Success Criteria

### ✅ PASS Conditions (Minimum)
- [x] Test 1: Restaurant dropdown loads and populates
- [x] Test 2: Menu selection works without crash
- [x] Test 3: All tabs render (empty states OK)
- [x] Console shows NO `.map is not a function` errors
- [x] Backend stable, no errors

### ⚠️ ACCEPTABLE (Not Failures)
- Empty states (if restaurant has no menus/specials/tips)
- Eslint warnings in console (cosmetic)
- Slow loading (network issue, not code issue)

### ❌ FAIL Conditions (Rollback Triggers)
- ErrorBoundary crash screen appears
- `.map is not a function` errors return
- Any tab consistently crashes
- Backend service crashes/restarts
- New 401 auth errors appear

---

## Reporting Results

### If All Tests Pass

**Document in this file:**
```
## VERIFICATION COMPLETE - PASSED ✅
Date: 2026-01-18
Tester: [Your Name]
Time: [XX:XX UTC]

✅ Test 1: Restaurant dropdown loads (200 OK, populated)
✅ Test 2: Menu selection works (data loads correctly)
✅ Test 3: All tabs render (no crashes, empty states OK)
✅ Test 4: Add item works (no nested map crash)
✅ Test 5: Review flow works (or N/A if no review items)
✅ Backend: Stable, no errors
✅ Performance: CPU/Memory within limits

Console: Clean - no .map errors
Network: All API calls 200 OK
Status: Menu Manager STABLE

Evidence:
- [Attach screenshot of Console with no errors]
- [Attach screenshot of working restaurant dropdown]
```

### If Any Test Fails

**Document failure:**
```
## VERIFICATION FAILED ❌
Date: 2026-01-18
Failed Test: [Number and description]

Error Message:
[Exact console error, copy/paste]

Error Location:
[Line number from console]

Trigger:
[What action caused the error]

Evidence Attached:
- Console screenshot
- Network tab screenshot (show API response)
- Backend log excerpt

Next Action: [HOLD / ROLLBACK / INVESTIGATE]
```

**Then:**
1. **Do NOT deploy again** without understanding the failure
2. **Do NOT rebuild** immediately
3. **Capture all evidence** first
4. **Review MENU_MANAGER_EVIDENCE.md** to identify gap

---

## Rollback Procedure (If Needed)

**Only rollback if FAIL conditions are met.**

```bash
cd /root/cwm-frontend-react

# Find commit before Menu Manager fixes
git log --oneline -5

# Revert to previous working state
git revert <commit-hash>

# Rebuild (one time only)
npm run build

# Safe deploy (no rm -rf)
sudo cp build/index.html /var/www/html/index.html
sudo cp -r build/static/* /var/www/html/static/

echo "Rollback complete - $(date)"
```

Then re-test Test 1 only to confirm rollback worked.

---

## Timeline

**Total: ~18 minutes**
- Setup: 1 min
- Test 1: 3 min
- Test 2: 4 min
- Test 3: 3 min
- Test 4: 4 min
- Test 5: 3 min (or skip if N/A)
- Health Check: 2 min

---

## What We Fixed (Reference)

1. **Restaurant list normalization** - `dataService.listRestaurants()` extracts array from `{restaurants: [...]}`
2. **Menu data normalization** - Ensures `menus`, `specials`, `upsell_tips` are always arrays
3. **Category items guard** - Protects `c.items.map()` in nested updates (line 812)
4. **Review flow guard** - Protects `c.items.map()` in mark-reviewed (line 1008)
5. **Empty state handling** - All arrays default to `[]` so `.map()` never fails

**Build Size:** +24 bytes (minimal impact)
**Deployment Method:** Safe copy (no rm -rf, no downtime)

---

## FINAL INSTRUCTION

**Do NOT mark Menu Manager as "complete" or "fixed" until:**

You have personally completed this checklist and documented results.

The words "Menu Manager STABLE" cannot be used until:
- All tests pass
- Evidence is captured
- Results are documented in this file

**Start verification now. Report back with PASS/FAIL.**
