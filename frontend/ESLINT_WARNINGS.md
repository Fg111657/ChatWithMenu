# ESLint Warnings to Fix

## Current Status
Build succeeds with **exit code 0** but has ESLint warnings.
If `CI=true` is set, these warnings would cause build to fail.

## Warnings Found (2026-01-14)

### 1. NavBarLayout.js (2 warnings)
- Line 21: `HomeIcon` imported but never used
- Line 39: `isMobile` assigned but never used

### 2. AudioRecorderModal.js (5 warnings)
- Line 1: `useEffect` imported but never used
- Line 4: `Button` imported but never used
- Line 10: `mediaRecorder` assigned but never used
- Line 10: `setMediaRecorder` assigned but never used
- Line 11: `setIsRecording` assigned but never used

### 3. DishViewer.js (1 warning)
- Line 29: useEffect missing dependency `restaurantId`

### 4. AddRestaurantScreen.js (1 warning)
- Line 18: `Divider` imported but never used

### 5. CreateAccountScreen.js (1 warning)
- Line 22: `LoginIcon` imported but never used

### 6. DashboardScreen.js (1 warning)
- Line 36: `ROLE_DINER` assigned but never used

### 7. HowItWorksScreen.js (1 warning)
- Line 12: `Stack` imported but never used

### 8. MenuManagerScreen.js (5 warnings)
- Line 10: `normalizeItemModifiers` imported but never used
- Line 65: `MoreVertIcon` imported but never used
- Line 90: `createEmptyCategory` assigned but never used
- Line 212: `getConfidenceLevel` assigned but never used
- Line 278: `itemsNeedingReview` assigned but never used
- Line 2036: useEffect missing dependencies `data.item` and `item`

### 9. PricingScreen.js (1 warning)
- Line 12: `Stack` imported but never used

### 10. ServerDashboardScreen.js (6 warnings)
- Line 1: `useCallback` imported but never used
- Line 26: `ListItemIcon` imported but never used
- Line 36: `Badge` imported but never used
- Line 40: `WarningIcon` imported but never used
- Line 42: `CheckCircleIcon` imported but never used
- Line 102: `userId` assigned but never used
- Line 265: useEffect missing dependency `selectedMenuId`

## Fix Strategy

### Option 1: Fix Properly (RECOMMENDED)
Remove unused imports and fix React hook dependencies.
**Pros**: Clean code, safe in all environments
**Cons**: Requires code changes

### Option 2: Temporarily Allow Warnings (NOT RECOMMENDED)
Set `CI=false` in build command: `"build": "CI=false react-scripts build"`
**Pros**: Quick fix
**Cons**: Hides real issues, unsafe for production CI/CD

## Recommendation
Fix these warnings properly. Most are simple unused import removals.
The useEffect warnings may need careful review to avoid bugs.
