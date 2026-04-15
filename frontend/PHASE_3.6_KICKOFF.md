# Phase 3.6 Kickoff — What's Done, What's Next

## Current Status (Phase 3.5 Complete ✅)

### What's Working:
- ✅ Phase 3.5-A: Server filters/search/collapse
- ✅ Phase 3.5-B: Needs-review workflow
- ✅ Phase 3.4: Owner import/plain text
- ✅ Phase 3.3: Multi-menu support
- ✅ Phase 3.1/3.2: Backend contract hardening
- ✅ Phase 3.0: Parser accuracy + market price support
- ✅ Safe deployment script (`./deploy.sh`) with hard gates

### What Needs Immediate Attention:
- ⚠️ **19 ESLint warnings** → See `ESLINT_WARNINGS.md`
- 🚨 **Exposed Supabase key** → Must rotate immediately (see `MESSAGE_TO_JUNIOR_DEV.md`)

---

## Phase 3.6 — Audit + Accountability

**Goal:** Show who changed what, when, and enable rollback.

**Why now:** You have fast workflows (import, bulk review, replace/append). Audit/undo is the missing piece that makes owners comfortable using these during real operations.

### The Problem Today:
- Owners fear using "Replace" → might lose data
- Can't track who made mistakes → blame game
- Can't rollback bad imports → manual recovery
- No accountability → hesitation to delegate

### The Solution (Phase 3.6):
- **3.6-A:** Backend audit log (who/what/when)
- **3.6-B:** History drawer (per-menu, per-item views with filters)
- **3.6-C:** Undo last change (import, edit)
- **3.6-D:** Role-based permissions (Owner/Manager/Server)

### Success Looks Like:
1. Owners confidently use "Replace" during service
2. Zero manual data recovery requests
3. Disputes resolved in seconds (check history)
4. Managers delegate without fear

---

## Next Steps

### For Junior Dev (Immediate):
1. Read `MESSAGE_TO_JUNIOR_DEV.md`
2. Rotate exposed Supabase key
3. Fix ESLint warnings from `ESLINT_WARNINGS.md`
4. Only deploy via `./deploy.sh` going forward

### For Phase 3.6 Implementation:
1. Review `PHASE_3.6_PLAN.md` for detailed specs
2. Start with 3.6-A (backend audit table)
3. Then 3.6-B (history UI)
4. Then 3.6-C (undo)
5. Finally 3.6-D (permissions)

**Estimated scope:** ~20-28 hours focused dev work

---

## Files Created Today

- `deploy.sh` → Safe deployment with hard gates
- `ESLINT_WARNINGS.md` → All warnings to fix
- `MESSAGE_TO_JUNIOR_DEV.md` → Deployment rules + security warning
- `PHASE_3.6_PLAN.md` → Full audit/accountability spec
- `PHASE_3.6_KICKOFF.md` → This file

Updated:
- `.gitignore` → Added `.env` to prevent key leaks

---

## Questions?

If anything is unclear or you need adjustments to the Phase 3.6 plan, let me know.
Otherwise, junior dev can proceed with:
1. Security fix (rotate key)
2. Code quality (fix warnings)
3. Phase 3.6-A (audit backend)
