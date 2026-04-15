# Message to Junior Dev

## Deployment Rule Going Forward

**We do not manually deploy anymore. Always deploy with:**
```bash
./deploy.sh
```

This script has hard gates that will block deployment if:
- Build exits non-zero
- Build artifacts are missing or incomplete
- Deployment verification fails

## Fix the Real Root Cause (Warnings)

**Next task is to drive warnings to zero so CI can't fail unexpectedly.**

Fix all items in `ESLINT_WARNINGS.md`. No suppressing warnings unless we document why.

### Acceptance Criteria:
1. `npm run build` exits 0 with 0 ESLint warnings
2. `CI=true npm run build` exits 0
3. `./deploy.sh` runs clean and verifies production

## 🚨 SECURITY RED FLAG

**Immediately rotate/remove the exposed SUPABASE_KEY that appeared in terminal output.**

Keys should live in `.env` / server env vars, **never printed or committed**.

If that key is a service role key, treat as compromised and rotate now.

### Steps to fix:
1. Go to Supabase dashboard → Settings → API
2. Rotate the service role key
3. Update the new key in your `.env` file (NOT in git)
4. Ensure `.env` is in `.gitignore`
5. Never run `env` commands that print sensitive values

## Why This Matters

Currently:
- Build succeeds locally (exit code 0) ✅
- Build has ESLint warnings ⚠️
- If anyone runs with `CI=true` (common in GitHub Actions), build will fail with exit code 1 ❌

The deployment script prevents deploying bad builds, but we need to fix the root cause so builds are reliable in all environments.
