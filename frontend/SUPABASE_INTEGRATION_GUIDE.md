# Supabase Integration Guide

## Architecture Decision: AUGMENT (Not Replace)

Supabase is integrated as an **augmentation layer** for auth and realtime features.

**Supabase handles:**
- ✅ Auth (users, sessions, JWT tokens)
- ✅ Roles (owner / manager / server)
- ⏳ Realtime (later, optional)
- ⏳ Audit logs (Phase 3.6, optional)

**Flask backend remains source of truth for:**
- Restaurants
- Menus / menu_data
- Parser logic
- "Needs review" workflow

---

## Security Model

### Frontend (React)
- Uses **anon key** (public, safe to expose)
- Handles user login/signup
- Gets JWT token from Supabase
- Sends JWT in `Authorization: Bearer <token>` header to Flask

### Backend (Flask)
- Uses **service role key** (NEVER in frontend)
- Verifies JWT tokens from frontend
- Serves data from existing DB
- Service role key bypasses ALL Row Level Security

**CRITICAL:** Service role key must ONLY exist in backend `.env`

---

## Files Created

### Frontend
- `src/services/supabaseClient.js` → Supabase client (anon key)
- `.env` → Contains `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
- `.env.template` → Template with placeholder keys

### Backend
- `supabase_client.py` → Supabase client wrapper (service role key)
- `.env` → Contains `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `.env.template` → Template with placeholder keys
- `.gitignore` → Ensures `.env` is never committed

---

## Setup Instructions

### 1. Get Real Keys from Supabase Dashboard

**WARNING:** The keys in `.env` files are placeholders and must be replaced.

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy these keys:
   - **Project URL** (e.g., `https://YOUR-PROJECT-ID.supabase.co`)
   - **anon public** key (for frontend)
   - **service_role** key (for backend ONLY)

### 2. Update Frontend `.env`

File: `/root/cwm-frontend-react/.env`

```bash
DANGEROUSLY_DISABLE_HOST_CHECK=true

# Supabase Configuration (FRONTEND ONLY - Anon Key)
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

### 3. Update Backend `.env`

File: `/root/chatwithmenu/Backend/python/.env`

```bash
# Supabase Configuration (BACKEND ONLY - Service Role Key)
SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

### 4. Test Connection (Backend)

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

---

## Auth Flow (Target State)

### Current State (Before Integration)
```
Frontend → Flask API (no auth or basic auth)
         → Returns menu data
```

### Target State (After Integration)
```
1. User logs in via Supabase (frontend)
2. Supabase returns JWT token
3. Frontend sends request to Flask with header:
   Authorization: Bearer <jwt_token>
4. Flask verifies JWT using Supabase client
5. Flask serves menu data from existing DB
6. Frontend displays data
```

### Implementation Steps (Phase 3.6)

**Phase 3.6-A: Backend Audit Log**
- Add `user_id` / `email` to audit log
- Get user info from verified JWT
- Log all write operations

**Phase 3.6-B: History UI**
- Show who made changes (from audit log)
- Display user email/name

**Phase 3.6-C: Undo**
- Verify user has permission to undo
- Log undo action with user info

**Phase 3.6-D: Permissions**
- Store roles in Supabase user metadata OR in your DB
- Check role before allowing operations
- Roles: Owner, Manager, Server

---

## Flask Middleware Example (Future)

```python
from flask import request, jsonify
from supabase_client import verify_jwt_token

def require_auth(f):
    """Decorator to require Supabase JWT auth"""
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401

        token = auth_header.replace('Bearer ', '')

        try:
            user = verify_jwt_token(token)
            # Add user info to request context
            request.current_user = user
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': str(e)}), 401

    wrapper.__name__ = f.__name__
    return wrapper


# Usage:
@api_namespace.route('/restaurant/<int:restaurant_id>')
class RestaurantResource(Resource):
    @require_auth
    def get(self, restaurant_id):
        user = request.current_user
        # ... serve data
```

---

## What NOT to Do (Critical)

❌ **NEVER** use service role key in frontend
❌ **NEVER** log or print environment variables
❌ **NEVER** commit `.env` files to git
❌ **NEVER** replace your primary DB with Supabase yet
❌ **NEVER** run migrations without approval

---

## Acceptance Criteria

Before proceeding with Phase 3.6:

✅ Frontend has Supabase client with anon key
✅ Backend has Supabase client with service role key
✅ No secrets committed or logged
✅ Keys live only in `.env` files
✅ `.env` is in `.gitignore`
✅ Connection test passes (backend)
✅ Existing menu flows untouched

---

## Next Steps

1. **Immediate:** Replace placeholder keys with real rotated keys
2. **Verify:** Run backend connection test
3. **Proceed:** Implement Phase 3.6-A (audit log with user tracking)

Once Supabase auth is connected, Phase 3.6 can track:
- Who imported menus
- Who edited items
- Who bulk-reviewed
- Who undid changes

This enables audit, accountability, and trust.
