# Supabase Auth Integration - Complete Setup Guide

## Overview

This app now uses **Supabase Auth** as the single source of truth for authentication. The old SQLite-based `/api/loginUser` and `/api/createUser` endpoints are deprecated.

## Changes Made

### 1. Frontend Authentication
- ✅ **LoginScreen** now uses `supabase.auth.signInWithPassword()`
- ✅ **CreateAccountScreen** now uses `supabase.auth.signUp()`
- ✅ **API Client** (`apiClient.js`) automatically injects JWT tokens

### 2. Environment Configuration
Added to `.env`:
```
REACT_APP_API_BASE_URL=http://165.22.32.88:5000/api
```

### 3. New Files Created
- `/src/services/apiClient.js` - API helper with automatic JWT injection

---

## REQUIRED: Supabase Dashboard Configuration

**You MUST configure these settings in your Supabase Dashboard to fix the OAuth redirect issues:**

### Step 1: Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard
2. Select your project: `yphmqlkqxlzrruiwqfxz`
3. Go to: **Authentication → URL Configuration**

### Step 2: Configure URLs

#### Site URL
Set this to your **reachable frontend base URL**:
```
http://165.22.32.88:3000
```

#### Additional Redirect URLs
Add these URLs (click "+ Add URL" for each):
```
http://165.22.32.88:3000/*
http://165.22.32.88:3000/login
http://165.22.32.88:3000/dashboard
http://localhost:3000/*
```

### Step 3: Disable Email Confirmation (Optional - For Testing)
If you want to skip email confirmation during development:

1. Go to **Authentication → Providers**
2. Click **Email** provider
3. Toggle **OFF**: "Confirm email"
4. Click **Save**

**Note:** With email confirmation disabled, users can login immediately after signup without checking email.

### Step 4: Save Changes
Click **Save** at the bottom of the page.

---

## How to Test

### 1. Restart React Dev Server
The `.env` file was updated, so restart the dev server:
```bash
# Kill the current React process
pkill -f "react-scripts start"

# Restart it
cd /root/cwm-frontend-react
npm start
```

### 2. Create a Test Account
1. Go to: **http://165.22.32.88:3000/create-account**
2. Fill in:
   - Email: `supatest@example.com`
   - Name: `Supa Test`
   - Password: `test123456`
3. Click **Create Account**

**If email confirmation is ENABLED:**
- You'll see: "Account created! Please check your email..."
- Check Supabase Dashboard → Authentication → Users to verify the user exists
- Manually verify the user in dashboard, then try logging in

**If email confirmation is DISABLED:**
- You'll be logged in immediately
- Redirected to `/dashboard`

### 3. Verify JWT Token Works
After logging in, open Browser Console (F12) and run:
```javascript
const { data } = await window.supabase.auth.getSession()
console.log('JWT Token:', data.session.access_token)
console.log('User ID:', data.user.id)
console.log('Email:', data.user.email)
```

You should see:
- A long JWT token (starts with `eyJ...`)
- Your Supabase user ID (UUID format)
- Your email address

### 4. Test Protected API Endpoints
Now test that the backend receives the JWT:

```javascript
// In browser console
const { data } = await window.supabase.auth.getSession();
const token = data.session.access_token;
const userId = data.user.id;

// Test /api/me endpoint
fetch('http://165.22.32.88:5000/api/me', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);

// Test /api/modifyUser (should work - same user)
fetch(`http://165.22.32.88:5000/api/modifyUser/${userId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ user_data: { name: 'Updated Name' } })
})
.then(r => r.json())
.then(console.log);

// Test cross-user modification (should fail with 403)
fetch('http://165.22.32.88:5000/api/modifyUser/999999', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ user_data: { name: 'Hacked' } })
})
.then(r => r.json())
.then(console.log);  // Should show 403 error
```

---

## Using the New API Client

For any new API calls in your React components, use the `apiFetch` helper:

```javascript
import { apiFetchJSON } from '../services/apiClient';

// Example: Modify user profile
const updateProfile = async (userId, newName) => {
  try {
    const result = await apiFetchJSON(`/modifyUser/${userId}`, {
      method: 'POST',
      body: { user_data: { name: newName } }
    });
    console.log('Profile updated:', result);
  } catch (error) {
    console.error('Failed to update profile:', error.message);
  }
};

// Example: Save user preferences
const savePreferences = async (userId, restrictions) => {
  try {
    await apiFetchJSON(`/saveUserPreferences/${userId}/allergy`, {
      method: 'POST',
      body: { dietary_restrictions: restrictions }
    });
  } catch (error) {
    console.error('Failed to save preferences:', error.message);
  }
};
```

The `apiFetch` helper automatically:
- ✅ Gets the current Supabase session
- ✅ Extracts the JWT access token
- ✅ Adds `Authorization: Bearer <token>` header
- ✅ Sends the request to the backend

---

## Backend Changes (Already Done)

The backend (`/root/chatwithmenu/Backend/python`) is already configured:

✅ `@require_auth` decorator verifies Supabase JWT tokens
✅ Audit logging tracks all auth events
✅ Protected endpoints require valid JWT
✅ Same-user enforcement on `/modifyUser`, `/saveUserPreferences`, etc.

---

## Troubleshooting

### Issue: "OTP expired" or "access_denied" error
**Cause:** Supabase redirecting to localhost instead of your server IP
**Fix:** Configure Supabase URLs in Dashboard (see Step 1-2 above)

### Issue: "Missing Authorization header" on API calls
**Cause:** Frontend not sending JWT token
**Fix:** Make sure you're using `apiFetch()` from `apiClient.js`, not raw `fetch()`

### Issue: "Invalid token" or 401 errors
**Cause:** JWT token expired or invalid
**Fix:**
1. Check Supabase session: `await supabase.auth.getSession()`
2. Token expires after 1 hour by default
3. Supabase auto-refreshes if `supabase.auth.onAuthStateChange()` is set up

### Issue: User can't login after signup
**Cause:** Email confirmation is enabled
**Fix:** Either:
- Disable email confirmation in Supabase Dashboard, OR
- Manually verify user in Supabase Dashboard → Users, OR
- Check email for confirmation link

---

## Old Endpoints (Deprecated)

These endpoints should NOT be used from the frontend anymore:

- ❌ `POST /api/loginUser` - Use `supabase.auth.signInWithPassword()` instead
- ❌ `POST /api/createUser` - Use `supabase.auth.signUp()` instead
- ❌ `POST /api/getOrCreateUser` - Deprecated

The backend endpoints still exist but will not be called by the new auth flow.

---

## Success Criteria

You'll know everything is working when:

1. ✅ You can create an account at `/create-account`
2. ✅ You can login at `/login`
3. ✅ Browser console shows valid JWT token
4. ✅ `/api/me` returns your user info
5. ✅ `/api/modifyUser/<your_id>` works (200 OK)
6. ✅ `/api/modifyUser/<other_id>` fails (403 Forbidden)
7. ✅ Audit logs show `USER_PROFILE_MODIFIED` events

---

## Next Steps

After verifying auth works:

1. **Phase 3.6-B**: Add logout endpoint + session management
2. **Phase 3.6-C**: Protect chat/message endpoints
3. **Phase 3.6-D**: Role-based access control (RBAC)
