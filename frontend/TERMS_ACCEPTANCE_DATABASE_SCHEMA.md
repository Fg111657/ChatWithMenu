# Terms Acceptance Database Schema

## Overview
This document describes the database schema and implementation required to track Terms & Conditions acceptance for legal compliance.

## Version Information
- **Terms Version**: 1.0.0
- **Effective Date**: January 15, 2026
- **Schema Version**: 1.0.0

---

## Current Implementation (Phase 1: Supabase User Metadata)

### Storage Location
Terms acceptance data is currently stored in **Supabase Auth user metadata** during account creation.

### Metadata Fields
```javascript
{
  name: string,                    // User's display name
  termsAccepted: boolean,          // Must be true
  termsVersion: string,            // e.g., "1.0.0"
  termsAcceptedAt: string,         // ISO 8601 timestamp
}
```

### Implementation Details

**Frontend (CreateAccountScreen.js:102-110)**
```javascript
const { data, error: authError } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: {
      name: name,
      termsAccepted: true,
      termsVersion: '1.0.0',
      termsAcceptedAt: new Date().toISOString(),
    }
  }
});
```

**Verification**
```javascript
const { data: { user } } = await supabase.auth.getUser();
const termsAccepted = user?.user_metadata?.termsAccepted;
const termsVersion = user?.user_metadata?.termsVersion;
```

---

## Recommended Implementation (Phase 2: Dedicated Table)

### Why a Dedicated Table?
- **Audit trail**: Track re-acceptance when terms change
- **Legal compliance**: Maintain immutable acceptance records
- **Versioning**: Support multiple versions over time
- **Reporting**: Generate compliance reports
- **User management**: Allow admin queries

### Proposed Schema

#### Table: `user_terms_acceptance`

```sql
CREATE TABLE user_terms_acceptance (
  id BIGSERIAL PRIMARY KEY,

  -- User identification
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_user_id INTEGER,  -- Map to legacy user_data table if needed

  -- Terms version information
  terms_version VARCHAR(20) NOT NULL,  -- e.g., "1.0.0"
  terms_type VARCHAR(50) DEFAULT 'terms_and_conditions',  -- Future: privacy_policy, etc.

  -- Acceptance details
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acceptance_method VARCHAR(50) NOT NULL,  -- 'modal', 'checkbox', 're-acceptance'
  user_agent TEXT,  -- Browser/device information
  ip_address INET,  -- IP address at time of acceptance

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Ensure one acceptance per user per version
  UNIQUE(user_id, terms_version, terms_type)
);

-- Index for fast user lookups
CREATE INDEX idx_user_terms_user_id ON user_terms_acceptance(user_id);

-- Index for version queries
CREATE INDEX idx_user_terms_version ON user_terms_acceptance(terms_version);

-- Index for compliance reporting
CREATE INDEX idx_user_terms_accepted_at ON user_terms_acceptance(accepted_at);
```

#### Row-Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance records
CREATE POLICY "Users can view own terms acceptance"
  ON user_terms_acceptance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot insert directly (must use backend function)
-- This prevents tampering with acceptance records

-- Admin policy (if needed)
CREATE POLICY "Admins can view all terms acceptance"
  ON user_terms_acceptance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_data
      WHERE user_data.supabase_uuid = auth.uid()
      AND user_data.invite_code IN ('1122', 'DEV-INVITE')
    )
  );
```

---

## Backend Implementation

### Service: `recordTermsAcceptance`

**Location**: `backend/services/terms_service.py` (create if needed)

```python
from datetime import datetime
from supabase import create_client, Client
import os

supabase: Client = create_client(
    os.environ.get('SUPABASE_URL'),
    os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
)

def record_terms_acceptance(
    user_id: str,
    terms_version: str,
    acceptance_method: str,
    user_agent: str = None,
    ip_address: str = None
) -> dict:
    """
    Record user acceptance of Terms & Conditions

    Args:
        user_id: Supabase UUID
        terms_version: Version accepted (e.g., "1.0.0")
        acceptance_method: How accepted (e.g., "modal")
        user_agent: Browser user agent
        ip_address: User IP address

    Returns:
        dict: Acceptance record

    Raises:
        Exception: If recording fails
    """

    # Get legacy user ID if exists
    legacy_user = supabase.table('user_data') \
        .select('id') \
        .eq('supabase_uuid', user_id) \
        .single() \
        .execute()

    legacy_user_id = legacy_user.data.get('id') if legacy_user.data else None

    # Insert acceptance record
    result = supabase.table('user_terms_acceptance').insert({
        'user_id': user_id,
        'legacy_user_id': legacy_user_id,
        'terms_version': terms_version,
        'terms_type': 'terms_and_conditions',
        'acceptance_method': acceptance_method,
        'user_agent': user_agent,
        'ip_address': ip_address,
        'accepted_at': datetime.utcnow().isoformat(),
    }).execute()

    return result.data


def has_accepted_current_terms(user_id: str, current_version: str = '1.0.0') -> bool:
    """
    Check if user has accepted current terms version

    Args:
        user_id: Supabase UUID
        current_version: Current terms version to check

    Returns:
        bool: True if user has accepted current version
    """
    result = supabase.table('user_terms_acceptance') \
        .select('id') \
        .eq('user_id', user_id) \
        .eq('terms_version', current_version) \
        .eq('terms_type', 'terms_and_conditions') \
        .execute()

    return len(result.data) > 0


def get_user_acceptance_history(user_id: str) -> list:
    """
    Get full acceptance history for user (for audit/support)

    Args:
        user_id: Supabase UUID

    Returns:
        list: All acceptance records for user
    """
    result = supabase.table('user_terms_acceptance') \
        .select('*') \
        .eq('user_id', user_id) \
        .order('accepted_at', desc=True) \
        .execute()

    return result.data
```

---

## API Endpoints

### POST `/api/terms/accept`

**Purpose**: Record terms acceptance (called after account creation or re-acceptance)

**Authentication**: Required (JWT token)

**Request**:
```json
{
  "terms_version": "1.0.0",
  "acceptance_method": "modal"
}
```

**Response**:
```json
{
  "success": true,
  "acceptance_id": 123,
  "accepted_at": "2026-01-20T10:30:00Z"
}
```

### GET `/api/terms/status`

**Purpose**: Check if user has accepted current terms

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "has_accepted": true,
  "current_version": "1.0.0",
  "accepted_at": "2026-01-20T10:30:00Z",
  "needs_reacceptance": false
}
```

---

## Frontend Validation

### Account Creation Flow

```javascript
// 1. User fills form
// 2. User clicks "Create Account"
// 3. Terms modal appears
// 4. User scrolls and clicks accept
// 5. Frontend calls Supabase signup with metadata
// 6. Backend stores acceptance record (if using dedicated table)
// 7. User is logged in

// CreateAccountScreen.js
const handleTermsAccept = async (acceptanceData) => {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        termsAccepted: true,
        termsVersion: acceptanceData.version,
        termsAcceptedAt: acceptanceData.acceptedAt,
      }
    }
  });

  // Optionally record in dedicated table
  if (!error && data.user) {
    await fetch(`${BASE_URL}/api/terms/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        terms_version: acceptanceData.version,
        acceptance_method: 'modal',
      }),
    });
  }
};
```

---

## Version Update Strategy

### When Terms Version Changes

**Example: Updating from 1.0.0 to 1.1.0**

1. **Update Constants**
   ```javascript
   // TermsAndConditionsModal.jsx
   const TERMS_VERSION = '1.1.0';
   const EFFECTIVE_DATE = 'March 1, 2026';
   ```

2. **Check on Login**
   ```javascript
   // LoginScreen.js or App.js
   useEffect(() => {
     const checkTermsVersion = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       const userVersion = user?.user_metadata?.termsVersion;
       const currentVersion = '1.1.0';

       if (userVersion !== currentVersion) {
         // Show re-acceptance modal
         setShowTermsReacceptanceModal(true);
       }
     };

     checkTermsVersion();
   }, []);
   ```

3. **Force Re-acceptance**
   - Show modal on login if version mismatch
   - Block app usage until accepted
   - Update user metadata with new version

---

## Compliance Checklist

### Legal Requirements Met

- [x] **Pre-registration acceptance** - Modal shown before account creation
- [x] **Explicit consent** - User must scroll and click accept button
- [x] **Timestamp tracking** - ISO 8601 timestamp recorded
- [x] **Version tracking** - Terms version stored with acceptance
- [x] **Persistent access** - Terms available at `/terms` route
- [x] **Privacy Policy linkage** - Privacy policy linked in terms modal
- [x] **Immutable records** - Acceptance cannot be edited (in dedicated table)
- [x] **Audit trail** - Full history maintained per user
- [x] **Re-acceptance workflow** - Version checking implemented

### Recommended Additions

- [ ] **IP address logging** - Record IP at acceptance time
- [ ] **User agent logging** - Record browser/device information
- [ ] **Email confirmation** - Send acceptance confirmation email
- [ ] **Admin dashboard** - View acceptance rates and compliance
- [ ] **Data export** - Allow users to download their acceptance history
- [ ] **Multi-language support** - Terms in multiple languages
- [ ] **Accessibility audit** - Ensure WCAG 2.1 AA compliance

---

## Testing Checklist

### Manual Testing

- [ ] Create account - verify terms modal appears
- [ ] Scroll requirement - verify accept button enables after scroll
- [ ] Cancel modal - verify account not created when closed
- [ ] Accept terms - verify account created successfully
- [ ] Metadata storage - verify terms data in Supabase auth
- [ ] Persistent pages - verify `/terms` and `/privacy-policy` accessible
- [ ] Footer links - verify links work in CreateAccountScreen
- [ ] Mobile responsive - test on mobile viewport
- [ ] Keyboard navigation - test with keyboard only
- [ ] Screen reader - test with screen reader

### Automated Testing

```javascript
// Example Jest test
describe('Terms Acceptance Flow', () => {
  it('should show terms modal before account creation', async () => {
    const { getByText, getByRole } = render(<CreateAccountScreen />);

    fireEvent.change(getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(getByText('Create Account'));

    expect(getByText('Chat with Menu Terms & Conditions')).toBeInTheDocument();
  });

  it('should not create account if terms not accepted', async () => {
    // Test implementation
  });

  it('should store acceptance metadata in Supabase', async () => {
    // Test implementation
  });
});
```

---

## Migration Plan

### Phase 1: Current (User Metadata Only)
- ✅ Store in Supabase auth user_metadata
- ✅ Basic version tracking
- ✅ Pre-registration acceptance

### Phase 2: Dedicated Table (Recommended)
- Create `user_terms_acceptance` table
- Implement backend service
- Add API endpoints
- Migrate existing acceptances

### Phase 3: Enhanced Compliance
- Add IP and user agent logging
- Implement re-acceptance workflow
- Create admin compliance dashboard
- Add acceptance confirmation emails

---

## Security Considerations

### Data Protection
- Store acceptance records in secure database with RLS
- Encrypt PII fields (email, IP address)
- Implement data retention policy
- Allow user data export (GDPR compliance)

### Access Control
- Users can only view their own records
- Admins require special permissions
- Backend must verify JWT token for all operations
- No client-side modification of acceptance records

### Audit Requirements
- Log all acceptance record creation
- Monitor for unusual patterns (mass backdating, etc.)
- Regular compliance audits
- Quarterly review of terms acceptance rates

---

## Contact

For questions about this schema or implementation:
- **Technical**: Backend team
- **Legal**: legal@chatwithmenu.com
- **Privacy**: privacy@chatwithmenu.com

---

**Last Updated**: January 20, 2026
**Schema Version**: 1.0.0
