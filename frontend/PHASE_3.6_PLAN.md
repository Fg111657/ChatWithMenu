# Phase 3.6 — Audit + Accountability (Owner/Manager Trust)

## Goal
Show who changed what, when, and enable rollback.

## Context
You now have fast workflows (import, bulk review, replace/append, filters).
Audit/undo is the missing piece that makes owners comfortable using these operations during real service.

## Tasks

### 3.6-A: Backend Audit Log Table

**Create audit log system:**
- Log events:
  - Menu import (replace/append)
  - Menu create/rename/delete/reorder
  - Item edit
  - Bulk reviewed
  - price_type changes
  - allergens changes
- Store for each event:
  - `restaurant_id`
  - `user_id` / `email`
  - `event_type`
  - `diff_summary` (what changed)
  - `timestamp`

**Database schema:**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  menu_id INTEGER REFERENCES menus(id),
  user_id INTEGER,
  email VARCHAR(255),
  event_type VARCHAR(50),
  target_type VARCHAR(50),  -- 'menu', 'item', 'category'
  target_id INTEGER,
  diff_summary TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.6-B: Frontend "History" Drawer

**Per-menu and per-item views:**
- Show chronological history
- Filters:
  - "Imports"
  - "Edits"
  - "Reviewed"
  - "Bulk actions"
- Display:
  - Who made the change
  - When
  - What changed (diff summary)
  - Link to menu/item

**UI location:**
- MenuManager: Add "History" button next to menu selector
- Item editor: Add "Item History" link in item details

### 3.6-C: Undo Last Change

**Minimum viable:**
- "Undo last import" (replace/append actions)
  - Store previous `menu_data` in audit log `metadata`
  - Add "Undo" button in import success toast
  - Restore previous state on click

**Then:**
- Undo last item edit
  - Store previous item state in audit log
  - Add "Undo" option in item history view

**Implementation notes:**
- Undo is time-limited (e.g., 1 hour)
- Undo creates a new audit log entry (type: "undo")
- Cannot undo an undo

### 3.6-D: Permissions

**Define roles:**
- **Owner**: Full access (import, edit, delete, settings)
- **Manager**: Can import, edit, bulk review (cannot delete menus or change settings)
- **Server**: View-only + can flag items for review

**Backend:**
- Add `role` column to restaurant user associations
- Add role checks to API endpoints
- Return 403 for unauthorized actions

**Frontend:**
- Hide/disable UI based on user role
- Show role in dashboard header
- Owner can assign roles to other users

## Why This Phase Matters

Owners need confidence to use Replace/Append and bulk actions during real operations.

**Without audit:**
- Fear of losing data → won't use Replace
- Can't track who made mistakes → blame game
- Can't rollback bad imports → manual recovery

**With audit:**
- Full transparency → trust the system
- Accountability → clear ownership
- Safety net → undo mistakes easily

## Success Metrics

1. Owners use "Replace" confidently during service
2. Zero manual data recovery requests
3. Managers can delegate to staff without fear
4. Dispute resolution takes seconds (check history)

## Estimated Scope

- 3.6-A (Backend audit): ~4-6 hours (schema, logging hooks, queries)
- 3.6-B (History UI): ~6-8 hours (drawer, filters, formatting)
- 3.6-C (Undo): ~4-6 hours (restore logic, UI buttons, time limits)
- 3.6-D (Permissions): ~6-8 hours (backend roles, frontend guards, UI)

**Total: ~20-28 hours of focused dev work**

## Next Steps After 3.6

Once audit + permissions are in place:
- **Phase 4.0**: Multi-restaurant support for chains
- **Phase 4.1**: Menu versioning and scheduling (seasonal menus)
- **Phase 4.2**: Advanced analytics (popular items, price changes over time)
- **Phase 4.3**: Mobile app for servers
