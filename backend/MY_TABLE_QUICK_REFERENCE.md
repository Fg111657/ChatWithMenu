# My Table API - Quick Reference Card

Fast reference for developers integrating with the My Table API.

---

## Base URL

```
http://localhost:5000/api/table
```

---

## Authentication

All endpoints require JWT token:

```bash
Authorization: Bearer <jwt_token>
```

---

## Rate Limits (per day)

| Action | Limit |
|--------|-------|
| Invites | 3/day |
| Questions | 5/day |
| Answers | 20/day |
| Signals | 10/day |

---

## Quick Endpoint Reference

### Table Connections

```bash
# Send invitation
POST /api/table/invite
{"invitee_user_id": 123, "invited_reason": "Met at support group..."}

# Respond to invitation
POST /api/table/invite/{id}/respond
{"action": "accept"}  # or "decline", "block"

# List connections
GET /api/table/connections

# Remove connection
DELETE /api/table/connections/{id}
```

### Questions & Answers

```bash
# Ask question
POST /api/table/questions
{"template_id": "can_eat_safely", "restaurant_id": 42, "dietary_restriction": "celiac"}

# List questions
GET /api/table/questions?status=open&restaurant_id=42

# Get question details
GET /api/table/questions/{id}

# Update question
PUT /api/table/questions/{id}
{"status": "answered"}

# Delete question
DELETE /api/table/questions/{id}

# Answer question
POST /api/table/questions/{id}/answers
{"answer_text": "Yes, ate safely", "what_ordered": "Grilled chicken"}

# Mark answer helpful
POST /api/table/answers/{id}/mark-helpful
```

### Safety Signals

```bash
# Create signal
POST /api/table/signals
{
  "restaurant_id": 42,
  "restrictions_met": ["celiac", "gluten_free"],
  "dish_name": "Salmon",
  "confidence": 5,
  "verification_state": "staff_verified"
}

# List signals
GET /api/table/signals?restaurant_id=42&restriction_type=celiac

# Get trust scores
GET /api/table/restaurants/{id}/trust-scores
```

### Discovery & Reports

```bash
# Discover helpers
GET /api/table/discovery

# Report abuse
POST /api/table/reports
{
  "report_type": "unsafe_advice",
  "target_type": "answer",
  "answer_id": 123,
  "reason": "Dangerous recommendation"
}

# List reports (admin only)
GET /api/table/reports?status=pending
```

---

## Question Templates

| Template ID | Description |
|-------------|-------------|
| can_eat_safely | Has anyone with {restriction} eaten safely? |
| what_worked | What did you order that worked? |
| kitchen_understands | Did the kitchen understand cross-contact? |
| has_allergen_binder | Do they have an allergen binder? |
| change_gloves | Did they change gloves? |
| trust_again | Would you trust this place again? |

---

## Status Values

**Connection Status:** invited, accepted, declined, blocked, removed
**Question Status:** open, answered, expired
**Report Status:** pending, reviewed, actioned

---

## Verification States

- unverified
- restaurant_verified
- staff_verified
- kitchen_confirmed

---

## Evidence Types

- menu_label
- server_confirmed
- kitchen_confirmed
- user_experience

---

## Visibility Options

- table_only (default)
- private

---

## Common Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (not allowed) |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Server Error |

---

## JavaScript Example

```javascript
// Helper function
async function apiCall(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`http://localhost:5000${path}`, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }

  return response.json();
}

// Usage examples
async function sendInvite(userId, reason) {
  return apiCall('POST', '/api/table/invite', {
    invitee_user_id: userId,
    invited_reason: reason
  });
}

async function askQuestion(restaurantId, templateId, restriction) {
  return apiCall('POST', '/api/table/questions', {
    template_id: templateId,
    restaurant_id: restaurantId,
    dietary_restriction: restriction
  });
}

async function createSignal(restaurantId, restrictions, dishName) {
  return apiCall('POST', '/api/table/signals', {
    restaurant_id: restaurantId,
    restrictions_met: restrictions,
    dish_name: dishName,
    confidence: 5
  });
}

async function getConnections() {
  return apiCall('GET', '/api/table/connections');
}
```

---

## Python Example

```python
import requests

BASE_URL = 'http://localhost:5000'
JWT_TOKEN = 'your_jwt_token_here'

headers = {
    'Authorization': f'Bearer {JWT_TOKEN}',
    'Content-Type': 'application/json'
}

# Send invitation
response = requests.post(
    f'{BASE_URL}/api/table/invite',
    headers=headers,
    json={
        'invitee_user_id': 123,
        'invited_reason': 'Met at celiac support group'
    }
)
print(response.json())

# Ask question
response = requests.post(
    f'{BASE_URL}/api/table/questions',
    headers=headers,
    json={
        'template_id': 'can_eat_safely',
        'restaurant_id': 42,
        'dietary_restriction': 'celiac'
    }
)
print(response.json())

# Create safety signal
response = requests.post(
    f'{BASE_URL}/api/table/signals',
    headers=headers,
    json={
        'restaurant_id': 42,
        'restrictions_met': ['celiac', 'gluten_free'],
        'dish_name': 'Grilled Salmon',
        'confidence': 5
    }
)
print(response.json())
```

---

## cURL Examples

```bash
# Get connections
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:5000/api/table/connections

# Send invitation
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invitee_user_id": 123, "invited_reason": "Met at support group"}' \
  http://localhost:5000/api/table/invite

# Ask question
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "can_eat_safely", "restaurant_id": 42, "dietary_restriction": "celiac"}' \
  http://localhost:5000/api/table/questions

# Create safety signal
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 42,
    "restrictions_met": ["celiac"],
    "dish_name": "Salmon",
    "confidence": 5
  }' \
  http://localhost:5000/api/table/signals
```

---

## Testing Checklist

- [ ] Authentication (401 without token)
- [ ] Rate limiting (429 after limit)
- [ ] Cannot invite yourself
- [ ] Cannot answer own questions
- [ ] Cannot mark own answers helpful
- [ ] Max 10 table members
- [ ] Table-scoped visibility
- [ ] Bidirectional connections work
- [ ] Soft deletes (status changes)
- [ ] Trust scores calculated correctly

---

## Security Checklist

- [ ] User ID from JWT only (never from body)
- [ ] All endpoints require authentication
- [ ] Rate limits enforced server-side
- [ ] Input validation on all fields
- [ ] No public visibility option
- [ ] Atomic operations for critical updates
- [ ] Audit logging enabled
- [ ] SQL injection prevention (parameterized queries)

---

## Performance Tips

1. Cache trust scores (recalculated daily)
2. Use pagination for large result sets
3. Filter by restaurant_id when possible
4. Index foreign keys for fast joins
5. Batch operations when creating multiple records

---

## Troubleshooting

**401 Unauthorized**
- Check JWT token is valid and not expired
- Verify Authorization header format

**403 Forbidden**
- Check you're the owner of the resource
- For invitations, check you're the invitee (not inviter)

**429 Rate Limit Exceeded**
- Wait until next day (UTC)
- Check rate limit for action type

**400 Bad Request**
- Check required fields are present
- Verify enum values (status, visibility, etc.)
- Check min/max constraints (reason > 20 chars)

---

## Support

- **API Documentation:** MY_TABLE_API.md
- **Implementation Summary:** MY_TABLE_COMPLETION_SUMMARY.md
- **Server Logs:** systemd journal
- **Database:** SQLite at /var/www/chatwithmenu/Backend/python/localdata.db

---

**Last Updated:** January 16, 2024
**API Version:** 1.0
