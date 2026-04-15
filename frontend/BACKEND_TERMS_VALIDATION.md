# Backend Terms Acceptance Validation

## Overview
This document outlines the backend validation requirements to ensure users cannot bypass Terms & Conditions acceptance.

## Version Information
- **Terms Version**: 1.0.0
- **Effective Date**: January 15, 2026

---

## Critical Requirements

### ⚠️ NEVER TRUST THE FRONTEND

**The frontend can be bypassed.** Users with technical knowledge can:
- Modify JavaScript in the browser
- Skip the modal using DevTools
- Send API requests directly
- Manipulate local storage

**Therefore:** Backend MUST validate terms acceptance on EVERY protected operation.

---

## Validation Strategy

### Layer 1: Account Creation (Supabase Auth)

**Current Implementation:**
Terms acceptance is stored in Supabase Auth user metadata during signup.

```javascript
// Frontend: CreateAccountScreen.js
await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      termsAccepted: true,
      termsVersion: '1.0.0',
      termsAcceptedAt: new Date().toISOString(),
    }
  }
});
```

**Validation:**
Supabase Auth handles this automatically - metadata is set atomically with user creation.

**Status:** ✅ Secure (Supabase-managed)

---

### Layer 2: Legacy User Creation (Backend)

**Endpoint:** `POST /api/user` (via getOrCreateDatabaseUser)

**Current Flow:**
```python
# backend/routes/user_routes.py (or similar)
@app.route('/api/user', methods=['POST'])
@require_jwt  # Assumes JWT middleware exists
def create_user():
    # Get Supabase user from JWT
    user_id = get_jwt_identity()
    user = supabase.auth.admin.get_user(user_id)

    # CRITICAL: Verify terms acceptance from Supabase metadata
    terms_accepted = user.user_metadata.get('termsAccepted', False)
    terms_version = user.user_metadata.get('termsVersion')

    if not terms_accepted:
        return jsonify({
            'error': 'Terms acceptance required',
            'message': 'You must accept Terms & Conditions before creating an account.'
        }), 403

    if terms_version != CURRENT_TERMS_VERSION:
        return jsonify({
            'error': 'Terms version mismatch',
            'message': 'Please accept the current Terms & Conditions.',
            'current_version': CURRENT_TERMS_VERSION,
            'user_version': terms_version
        }), 403

    # Proceed with legacy user creation
    # ...
```

**Status:** ⚠️ TO BE IMPLEMENTED

---

### Layer 3: Protected Endpoints

**All protected endpoints should verify terms acceptance.**

#### Example: POST `/modifyUser/{userId}`

**Current Implementation:**
```python
# backend/routes/user_routes.py
@app.route('/modifyUser/<int:user_id>', methods=['POST'])
@require_jwt
def modify_user(user_id):
    # Extract JWT token from Authorization header
    token = request.headers.get('Authorization').replace('Bearer ', '')

    # Verify with Supabase
    user = supabase.auth.get_user(token)

    # CRITICAL: Verify terms acceptance
    if not user.user_metadata.get('termsAccepted', False):
        return jsonify({
            'error': 'Terms not accepted',
            'message': 'You must accept Terms & Conditions to use this feature.'
        }), 403

    # CRITICAL: Verify terms version
    if user.user_metadata.get('termsVersion') != CURRENT_TERMS_VERSION:
        return jsonify({
            'error': 'Terms version outdated',
            'message': 'Please accept the current Terms & Conditions.',
            'requires_reacceptance': True
        }), 403

    # Proceed with user modification
    # ...
```

**Status:** ⚠️ TO BE IMPLEMENTED

---

## Middleware Approach (Recommended)

### Create `require_terms_acceptance` Decorator

**File:** `backend/middleware/terms_middleware.py`

```python
from functools import wraps
from flask import request, jsonify
from services.auth_service import verify_jwt_token, get_user_from_token

CURRENT_TERMS_VERSION = '1.0.0'

def require_terms_acceptance(f):
    """
    Decorator to ensure user has accepted current Terms & Conditions.

    Usage:
        @app.route('/api/some-endpoint', methods=['POST'])
        @require_jwt
        @require_terms_acceptance
        def some_endpoint():
            # Your endpoint logic
            pass

    Returns:
        403 Forbidden if terms not accepted or outdated
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Get JWT token from Authorization header
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': 'No authorization header'}), 401

            token = auth_header.replace('Bearer ', '')

            # Verify token and get user
            user = get_user_from_token(token)
            if not user:
                return jsonify({'error': 'Invalid token'}), 401

            # Check terms acceptance
            terms_accepted = user.get('user_metadata', {}).get('termsAccepted', False)
            if not terms_accepted:
                return jsonify({
                    'error': 'terms_not_accepted',
                    'message': 'You must accept Terms & Conditions to use this service.',
                    'requires_acceptance': True,
                }), 403

            # Check terms version
            user_version = user.get('user_metadata', {}).get('termsVersion')
            if user_version != CURRENT_TERMS_VERSION:
                return jsonify({
                    'error': 'terms_outdated',
                    'message': f'Please accept the current Terms & Conditions (version {CURRENT_TERMS_VERSION}).',
                    'requires_reacceptance': True,
                    'current_version': CURRENT_TERMS_VERSION,
                    'user_version': user_version,
                }), 403

            # Terms validated, proceed with endpoint
            return f(*args, **kwargs)

        except Exception as e:
            return jsonify({
                'error': 'terms_validation_failed',
                'message': str(e)
            }), 500

    return decorated_function
```

### Usage

```python
from middleware.terms_middleware import require_terms_acceptance

@app.route('/api/protected-endpoint', methods=['POST'])
@require_jwt
@require_terms_acceptance  # Add this decorator
def protected_endpoint():
    # Your logic here
    # If this code executes, terms have been validated
    pass
```

---

## Endpoints Requiring Terms Validation

### ✅ Must Be Protected

These endpoints MUST enforce terms acceptance:

| Endpoint | Method | Priority | Notes |
|----------|--------|----------|-------|
| `/modifyUser/<userId>` | POST | 🔴 Critical | User data modification |
| `/saveUserPreferences/<userId>/<type>` | POST | 🔴 Critical | Dietary preferences (liability risk) |
| `/startChat` | POST | 🟡 High | Core feature |
| `/sendMessage` | POST | 🟡 High | Core feature |
| `/submitReview` | POST | 🟡 High | User-generated content |
| `/restaurant` | POST | 🟡 High | Restaurant creation |
| `/restaurant/<id>` | PATCH/DELETE | 🟡 High | Restaurant modification |
| `/family/members` | POST/PATCH/DELETE | 🔴 Critical | Family member management (liability) |
| `/family/members/<id>/allergies` | POST/DELETE | 🔴 Critical | Allergy management (HIGH liability) |

### ⚪ Optional (Read-Only)

These MAY be exempted (read-only, low risk):

| Endpoint | Method | Priority | Notes |
|----------|--------|----------|-------|
| `/loadUser/<userId>` | GET | ⚪ Low | Read user data |
| `/listRestaurants` | GET | ⚪ Low | Public data |
| `/restaurant/<id>` | GET | ⚪ Low | Public restaurant info |
| `/loadUserPreferences/<userId>` | GET | ⚪ Low | Read preferences |

**Recommendation:** Protect ALL authenticated endpoints by default. Whitelist exceptions explicitly.

---

## Error Response Format

### Standard Terms Error Response

```json
{
  "error": "terms_not_accepted",
  "message": "You must accept Terms & Conditions to use this service.",
  "requires_acceptance": true,
  "terms_url": "/terms",
  "current_version": "1.0.0"
}
```

### Version Mismatch Response

```json
{
  "error": "terms_outdated",
  "message": "Please accept the current Terms & Conditions (version 1.0.0).",
  "requires_reacceptance": true,
  "current_version": "1.0.0",
  "user_version": "0.9.0",
  "terms_url": "/terms"
}
```

---

## Frontend Error Handling

### Detect Terms Errors

```javascript
// dataService.js
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();

    // Check for terms-related errors
    if (error.error === 'terms_not_accepted' || error.error === 'terms_outdated') {
      // Show terms re-acceptance modal
      window.dispatchEvent(new CustomEvent('terms-reacceptance-required', {
        detail: {
          currentVersion: error.current_version,
          userVersion: error.user_version,
        }
      }));

      throw new Error(error.message);
    }

    throw new Error(error.message);
  }
  return response.json();
};
```

### App-Level Handler

```javascript
// App.js
const [showTermsReacceptance, setShowTermsReacceptance] = useState(false);

useEffect(() => {
  const handleTermsRequired = (event) => {
    setShowTermsReacceptance(true);
  };

  window.addEventListener('terms-reacceptance-required', handleTermsRequired);

  return () => {
    window.removeEventListener('terms-reacceptance-required', handleTermsRequired);
  };
}, []);

// Render re-acceptance modal
<TermsReacceptanceModal
  open={showTermsReacceptance}
  onAccept={handleReacceptance}
  onLogout={handleLogout}
/>
```

---

## Re-Acceptance Workflow

### When Terms Version Changes

**Example: 1.0.0 → 1.1.0**

1. **Update Backend Constant**
   ```python
   # backend/middleware/terms_middleware.py
   CURRENT_TERMS_VERSION = '1.1.0'
   ```

2. **User Hits Protected Endpoint**
   - Backend validates terms
   - Version mismatch detected
   - Returns 403 with `terms_outdated` error

3. **Frontend Shows Re-acceptance Modal**
   - User must scroll and re-accept
   - Frontend calls Supabase to update metadata
   - User can continue

4. **Update Supabase Metadata**
   ```javascript
   const { error } = await supabase.auth.updateUser({
     data: {
       termsVersion: '1.1.0',
       termsAcceptedAt: new Date().toISOString(),
     }
   });
   ```

5. **Optional: Record in Database**
   ```python
   # Store re-acceptance in user_terms_acceptance table
   record_terms_acceptance(
       user_id=user_id,
       terms_version='1.1.0',
       acceptance_method='reacceptance'
   )
   ```

---

## Testing Checklist

### Backend Validation Tests

#### Test 1: User Without Terms Acceptance
```python
def test_protected_endpoint_without_terms():
    # Create user without terms acceptance
    user = create_test_user(terms_accepted=False)
    token = get_jwt_token(user)

    # Call protected endpoint
    response = client.post('/api/protected-endpoint',
                           headers={'Authorization': f'Bearer {token}'})

    # Should return 403
    assert response.status_code == 403
    assert response.json['error'] == 'terms_not_accepted'
```

#### Test 2: User With Outdated Terms
```python
def test_protected_endpoint_with_outdated_terms():
    # Create user with old terms version
    user = create_test_user(terms_version='0.9.0')
    token = get_jwt_token(user)

    # Call protected endpoint
    response = client.post('/api/protected-endpoint',
                           headers={'Authorization': f'Bearer {token}'})

    # Should return 403
    assert response.status_code == 403
    assert response.json['error'] == 'terms_outdated'
    assert response.json['current_version'] == '1.0.0'
```

#### Test 3: User With Current Terms
```python
def test_protected_endpoint_with_current_terms():
    # Create user with current terms
    user = create_test_user(terms_version='1.0.0', terms_accepted=True)
    token = get_jwt_token(user)

    # Call protected endpoint
    response = client.post('/api/protected-endpoint',
                           headers={'Authorization': f'Bearer {token}'})

    # Should succeed
    assert response.status_code == 200
```

#### Test 4: Bypass Attempt (No Token)
```python
def test_protected_endpoint_without_token():
    # Call protected endpoint without token
    response = client.post('/api/protected-endpoint')

    # Should return 401
    assert response.status_code == 401
```

#### Test 5: Bypass Attempt (Invalid Token)
```python
def test_protected_endpoint_with_invalid_token():
    # Call protected endpoint with fake token
    response = client.post('/api/protected-endpoint',
                           headers={'Authorization': 'Bearer fake-token-123'})

    # Should return 401
    assert response.status_code == 401
```

---

## Security Audit Checklist

### ✅ Validation Requirements

- [ ] All protected endpoints use `@require_terms_acceptance` decorator
- [ ] Terms version is validated on every request
- [ ] Terms acceptance cannot be bypassed via frontend manipulation
- [ ] Invalid/missing tokens return 401
- [ ] Missing/outdated terms return 403
- [ ] Error messages are clear and actionable
- [ ] Re-acceptance workflow is implemented
- [ ] Terms version is configurable (not hardcoded everywhere)

### ✅ Legal Compliance

- [ ] Users cannot use protected features without acceptance
- [ ] Acceptance timestamp is recorded
- [ ] Terms version is tracked
- [ ] Re-acceptance is enforced when terms change
- [ ] Acceptance records are immutable
- [ ] Audit trail is maintained

### ✅ Operational

- [ ] Terms version can be updated without code changes
- [ ] Deployment strategy for version updates is documented
- [ ] Monitoring/alerting for terms validation failures
- [ ] Graceful degradation if terms service is unavailable

---

## Deployment Strategy

### Rolling Out Terms Validation

**Phase 1: Soft Launch (Warning Mode)**
```python
@require_terms_acceptance(enforce=False)  # Log warnings, don't block
def protected_endpoint():
    pass
```
- Log users who would be blocked
- Identify gaps in coverage
- Allow time for frontend updates

**Phase 2: Grace Period**
```python
@require_terms_acceptance(grace_period_days=14)
def protected_endpoint():
    pass
```
- Warn users with outdated terms
- Allow continued access for grace period
- Send reminder emails

**Phase 3: Full Enforcement**
```python
@require_terms_acceptance  # Full blocking
def protected_endpoint():
    pass
```
- Block all requests without current terms
- Require immediate re-acceptance

---

## Configuration Management

### Environment Variables

```bash
# .env
TERMS_VERSION=1.0.0
TERMS_ENFORCEMENT_ENABLED=true
TERMS_GRACE_PERIOD_DAYS=0
```

### Backend Configuration

```python
# backend/config.py
import os

class Config:
    CURRENT_TERMS_VERSION = os.getenv('TERMS_VERSION', '1.0.0')
    TERMS_ENFORCEMENT_ENABLED = os.getenv('TERMS_ENFORCEMENT_ENABLED', 'true').lower() == 'true'
    TERMS_GRACE_PERIOD_DAYS = int(os.getenv('TERMS_GRACE_PERIOD_DAYS', '0'))
```

---

## Monitoring & Alerting

### Metrics to Track

1. **Acceptance Rate**
   - % of new users accepting terms
   - Time to acceptance (signup → accept)

2. **Rejection Rate**
   - 403 errors due to missing terms
   - 403 errors due to outdated terms

3. **Re-acceptance Rate**
   - % of users re-accepting when terms change
   - Time to re-acceptance

4. **Bypass Attempts**
   - Invalid token attempts
   - Malformed requests

### Example Logging

```python
import logging

logger = logging.getLogger(__name__)

@require_terms_acceptance
def protected_endpoint():
    logger.info(f"Terms validated for user {user_id}", extra={
        'user_id': user_id,
        'terms_version': user_version,
        'endpoint': '/api/protected-endpoint'
    })
```

---

## Contact

For questions about backend validation:
- **Backend Team**: backend@chatwithmenu.com
- **Legal**: legal@chatwithmenu.com
- **Security**: security@chatwithmenu.com

---

**Last Updated**: January 20, 2026
**Backend Validation Version**: 1.0.0
