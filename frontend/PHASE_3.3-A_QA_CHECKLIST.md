# Phase 3.3-A: Menu Selector UI - QA Checklist

**Date:** 2026-01-14
**Feature:** Multi-menu support with selector dropdown
**Status:** ✅ **READY FOR QA**

---

## Pre-QA Setup

### Test Data Required

**Restaurant with Multiple Menus:**
To test menu switching, you need a restaurant with multiple menus. Use this test data:

```json
{
  "version": 2,
  "currency": "USD",
  "language": "en",
  "menus": [
    {
      "id": "dinner-menu",
      "name": "Dinner",
      "display_order": 1,
      "categories": [
        {
          "id": "cat-1",
          "name": "Entrees",
          "display_order": 1,
          "items": [
            {"id": "item-1", "name": "Steak", "price": 30.00, "price_type": "FIXED"},
            {"id": "item-2", "name": "Salmon", "price": 25.00, "price_type": "FIXED"}
          ]
        }
      ]
    },
    {
      "id": "lunch-menu",
      "name": "Lunch",
      "display_order": 2,
      "categories": [
        {
          "id": "cat-2",
          "name": "Sandwiches",
          "display_order": 1,
          "items": [
            {"id": "item-3", "name": "BLT", "price": 12.00, "price_type": "FIXED"}
          ]
        }
      ]
    }
  ],
  "specials": [],
  "upsell_tips": []
}
```

**How to Set Up:**
1. Navigate to Menu Manager
2. Use backend API to set restaurant menu_data to above JSON (or create via UI in Phase 3.3-B)

---

## QA Test Cases

### Test 1: Menu Selector Visibility

**Given:** Restaurant has 1 menu
**When:** User opens Menu Manager
**Then:** Menu selector dropdown is **NOT visible**

**Given:** Restaurant has 2+ menus
**When:** User opens Menu Manager
**Then:** Menu selector dropdown **IS visible** at top of page

**Pass Criteria:**
- ✅ Single menu: no selector
- ✅ Multiple menus: selector appears

---

### Test 2: Default Menu Selection

**Given:** Restaurant has multiple menus (Dinner, Lunch)
**When:** User opens Menu Manager
**Then:** First menu (Dinner) is selected by default

**Pass Criteria:**
- ✅ Dropdown shows "Dinner (X categories)"
- ✅ Categories sidebar shows Dinner categories only
- ✅ Console log shows: `[MenuManager] Default menu selected: { menuId: "dinner-menu", menuName: "Dinner" }`

---

### Test 3: Switch Menus

**Given:** Restaurant has Dinner and Lunch menus
**When:** User selects "Lunch" from menu dropdown
**Then:**
1. Dropdown updates to show "Lunch (X categories)"
2. Categories sidebar refreshes to show Lunch categories only
3. Dinner categories are no longer visible
4. First category in Lunch menu is auto-selected
5. Console log shows: `[MenuManager] Menu switched: { menuId: "lunch-menu", menuName: "Lunch", categoryCount: 1 }`

**Pass Criteria:**
- ✅ Categories switch correctly
- ✅ No bleed between menus (Dinner items not visible when Lunch selected)
- ✅ Console logging works
- ✅ Selected category resets to first category in new menu

---

### Test 4: Add Category to Selected Menu

**Given:** User has "Lunch" menu selected
**When:** User clicks "+ Add Category" button
**Then:**
1. New category appears in Lunch menu categories sidebar
2. New category does NOT appear in Dinner menu
3. User switches to Dinner menu: new category is not there
4. User switches back to Lunch menu: new category is still there

**Pass Criteria:**
- ✅ Category added to selected menu only
- ✅ Other menus unaffected
- ✅ Category persists after switching menus

---

### Test 5: Edit Item in Selected Menu

**Given:** User has "Dinner" menu selected with "Steak" item
**When:** User edits "Steak" → changes price to $35.00
**Then:**
1. Price updates in Dinner menu
2. User switches to Lunch menu
3. User switches back to Dinner menu
4. "Steak" still shows $35.00

**Pass Criteria:**
- ✅ Item changes apply to correct menu
- ✅ Changes persist after menu switching

---

### Test 6: Delete Category from Selected Menu

**Given:** User has "Lunch" menu selected with "Sandwiches" category
**When:** User deletes "Sandwiches" category
**Then:**
1. "Sandwiches" category removed from Lunch menu
2. User switches to Dinner menu
3. Dinner categories are still intact
4. User switches back to Lunch menu
5. "Sandwiches" category is gone

**Pass Criteria:**
- ✅ Category deleted from selected menu only
- ✅ Other menus unaffected

---

### Test 7: Needs Review Count (Per-Menu)

**Given:**
- Dinner menu has 2 items: 1 needs review
- Lunch menu has 1 item: 0 need review

**When:** User selects "Dinner" menu
**Then:** Banner shows "1 item needs review"

**When:** User switches to "Lunch" menu
**Then:** Banner shows "0 items need review" (or no banner)

**Pass Criteria:**
- ✅ Needs review count updates per selected menu
- ✅ Count is accurate

---

### Test 8: Save Persistence

**Given:** User makes changes to Lunch menu (add category, edit item)
**When:** User clicks "Save Menu"
**Then:**
1. Save succeeds
2. User refreshes page (F5)
3. User selects "Lunch" menu from dropdown
4. Changes are persisted

**Pass Criteria:**
- ✅ Multi-menu structure saves correctly
- ✅ Changes persist after reload
- ✅ Backend stores V2 format

---

### Test 9: Console Logging

**Given:** User opens Menu Manager with multiple menus
**When:** User switches from Dinner → Lunch → Dinner
**Then:** Console shows:
```
[MenuManager] Default menu selected: { menuId: "dinner-menu", menuName: "Dinner" }
[MenuManager] Menu switched: { menuId: "lunch-menu", menuName: "Lunch", categoryCount: 1 }
[MenuManager] Menu switched: { menuId: "dinner-menu", menuName: "Dinner", categoryCount: 2 }
```

**Pass Criteria:**
- ✅ Console logs all menu switches with correct details

---

### Test 10: No Crashes

**Given:** Various edge cases
**When:**
- User has 0 menus (empty structure)
- User has 1 menu with 0 categories
- User switches menus rapidly (10x fast)
- User deletes last category in menu

**Then:** No crashes or errors

**Pass Criteria:**
- ✅ App handles edge cases gracefully
- ✅ No console errors (red)

---

## Automated Test Results

**Test Suite:** `MenuManager-MenuSelector.test.js`

```
✓ selectedMenu defaults to first menu when not explicitly set
✓ selectedMenu returns correct menu when explicitly set
✓ categories are from selected menu, not other menus
✓ items are isolated per menu
✓ menu selector should not render when only one menu exists
✓ menu selector should render when multiple menus exist
✓ addCategory adds to selected menu only
✓ deleteCategory removes from selected menu only
✓ needsReviewCount is calculated per selected menu

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

---

## Acceptance Criteria (R.A.L.P.H.)

### ✅ Repeatable
- Works for any restaurant, any number of menus
- No hardcoded menu IDs or assumptions

### ✅ Atomic
- Only adds menu switching; no CRUD yet (Phase 3.3-B)
- Single focused feature

### ✅ Logged
- Console logs all menu_switch events with menuId, menuName, categoryCount

### ✅ Pushable
- One PR, one feature
- Build succeeds (226.37 KB, +247 B)
- 9/9 tests passing

### ✅ Hand-offable
- QA checklist provided
- Test data included
- Clear pass/fail criteria

---

## Known Limitations (Expected)

1. **Cannot create new menus yet** - Phase 3.3-B adds Menu CRUD
2. **Single menu restaurants don't show selector** - By design (conditional rendering)
3. **Menu order is by display_order** - No drag-drop reordering yet (Phase 3.3-B)

---

## Rollback Plan

If issues found during QA:

```bash
cd /root/cwm-frontend-react
git checkout HEAD~1 src/screens/MenuManagerScreen.js
rm src/screens/MenuManager-MenuSelector.test.js
npm run build
cp -r build/* /var/www/html/
```

---

## Sign-Off

**Developer:** Claude Sonnet 4.5
**Date:** 2026-01-14
**Phase:** 3.3-A - Menu Selector UI
**Status:** ✅ Ready for QA

**Tests Passing:** 9/9 ✅
**Build:** Success ✅
**Bundle Size:** 226.37 KB (+247 B from Phase 3.2)

---

**Next Phase:** 3.3-B (Menu CRUD: create/rename/delete/reorder)
