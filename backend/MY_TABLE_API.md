# My Table API Documentation

Complete API reference for the My Table feature (RALPH Framework: Reputation, Attribution, Limitation, Privacy, Human-scale).

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limits](#rate-limits)
3. [Phase 2: Table Connections](#phase-2-table-connections)
4. [Phase 3: Questions & Answers](#phase-3-questions--answers)
5. [Phase 4: Safety Signals & Trust Scores](#phase-4-safety-signals--trust-scores)
6. [Phase 5: Discovery & Abuse Prevention](#phase-5-discovery--abuse-prevention)
7. [Error Responses](#error-responses)

---

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

**Security Features:**
- User ID is ALWAYS extracted from validated JWT token (never from request body)
- Email from JWT is mapped to internal user_id via database lookup
- Unauthorized requests return `401 Unauthorized`
- Authorization failures return `403 Forbidden`

---

## Rate Limits

Rate limits are enforced server-side per user per day (UTC timezone):

| Action | Limit | Endpoint |
|--------|-------|----------|
| Invite | 3/day | POST /api/table/invite |
| Question | 5/day | POST /api/table/questions |
| Answer | 20/day | POST /api/table/questions/{id}/answers |
| Signal | 10/day | POST /api/table/signals |

**Rate Limit Response:**
```json
{
  "message": "Rate limit exceeded for action: invite. Try again tomorrow."
}
```
HTTP Status: `429 Too Many Requests`

---

## Phase 2: Table Connections

### POST /api/table/invite

Send a table invitation (2-way handshake required).

**Auth Required:** Yes
**Rate Limit:** 3 invites/day

**Request Body:**
```json
{
  "invitee_user_id": 123,
  "invited_reason": "We met at the celiac support group and discussed safe restaurants together"
}
```

**Required Fields:**
- `invitee_user_id` (integer): User ID to invite
- `invited_reason` (string): Why you're inviting them (min 20 characters)

**Response (201 Created):**
```json
{
  "invite_id": 456,
  "status": "invited",
  "invitee_user_id": 123,
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: invitee_user_id missing, invited_reason too short (<20 chars), cannot invite yourself, connection already exists, table full (max 10 accepted members)
- `404 Not Found`: Invitee user not found
- `429 Too Many Requests`: Rate limit exceeded (3/day)

---

### POST /api/table/invite/{invite_id}/respond

Respond to a table invitation (accept/decline/block).

**Auth Required:** Yes
**Rate Limit:** None

**Request Body:**
```json
{
  "action": "accept"
}
```

**Required Fields:**
- `action` (string): Must be one of: `accept`, `decline`, `block`

**Response (200 OK):**
```json
{
  "invite_id": 456,
  "status": "accepted",
  "action": "accept"
}
```

**Error Cases:**
- `400 Bad Request`: Invalid action, invitation already processed
- `403 Forbidden`: Only the invitee can respond (not the inviter)
- `404 Not Found`: Invitation not found

**Security Notes:**
- Only the invitee (table_member_user_id) can respond
- If accepting, both inviter's and invitee's tables must not be full (max 10)
- Status transitions: `invited` → `accepted`, `declined`, or `blocked`

---

### GET /api/table/connections

List all accepted table connections for the current user.

**Auth Required:** Yes
**Rate Limit:** None

**Query Parameters:** None

**Response (200 OK):**
```json
{
  "connections": [
    {
      "connection_id": 789,
      "user_id": 123,
      "name": "John Doe",
      "display_name": "John",
      "photo_url": "https://example.com/photo.jpg",
      "bio": "Living with celiac disease for 5 years",
      "help_count": 3,
      "connection_strength": 15,
      "invited_reason": "We met at the celiac support group",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T12:30:00Z"
    }
  ]
}
```

**Notes:**
- Only returns `accepted` status connections
- Bidirectional: Shows connections where you're either sender or receiver
- Ordered by `connection_strength` DESC, then `help_count` DESC
- `help_count`: Number of times this person has helped you (marked helpful answers)
- `connection_strength`: Calculated relationship strength score

---

### DELETE /api/table/connections/{connection_id}

Remove a table connection (soft delete - sets status to 'removed').

**Auth Required:** Yes
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "connection_id": 789,
  "status": "removed",
  "removed_at": "2024-01-16T09:00:00Z"
}
```

**Error Cases:**
- `403 Forbidden`: Only connection participants can remove (bidirectional check)
- `404 Not Found`: Connection not found

---

## Phase 3: Questions & Answers

### POST /api/table/questions

Ask a structured question to your table.

**Auth Required:** Yes
**Rate Limit:** 5 questions/day

**Request Body:**
```json
{
  "template_id": "can_eat_safely",
  "restaurant_id": 42,
  "dietary_restriction": "celiac",
  "visibility": "table_only",
  "expire_days": 30
}
```

**Required Fields:**
- `template_id` (string): One of the allowed templates (see below)
- `restaurant_id` (integer): Restaurant ID

**Optional Fields:**
- `dietary_restriction` (string): Dietary restriction type (e.g., "celiac", "peanut_allergy")
- `visibility` (string): `table_only` or `private` (default: `table_only`)
- `expire_days` (integer): Days until expiration (1-30, default: 30)

**Allowed Templates:**
- `can_eat_safely`: "Has anyone with {restriction} eaten safely at {restaurant}?"
- `what_worked`: "What did you order that worked?"
- `kitchen_understands`: "Did the kitchen understand cross-contact?"
- `has_allergen_binder`: "Do they have an allergen binder?"
- `change_gloves`: "Did they change gloves?"
- `trust_again`: "Would you trust this place again?"

**Response (201 Created):**
```json
{
  "question_id": 999,
  "template_id": "can_eat_safely",
  "restaurant_id": 42,
  "status": "open",
  "created_at": "2024-01-16T10:00:00Z",
  "expires_at": "2024-02-15T10:00:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: Missing required fields, invalid template_id, invalid visibility, expire_days out of range (1-30)
- `404 Not Found`: Restaurant not found
- `429 Too Many Requests`: Rate limit exceeded (5/day)

---

### GET /api/table/questions

List questions visible to the current user.

**Auth Required:** Yes
**Rate Limit:** None

**Query Parameters:**
- `status` (optional): Filter by status (`open`, `answered`, `expired`)
- `restaurant_id` (optional): Filter by restaurant ID

**Response (200 OK):**
```json
{
  "questions": [
    {
      "question_id": 999,
      "asker_user_id": 456,
      "template_id": "can_eat_safely",
      "restaurant_id": 42,
      "dietary_restriction": "celiac",
      "visibility": "table_only",
      "status": "open",
      "answer_count": 2,
      "created_at": "2024-01-16T10:00:00Z",
      "expires_at": "2024-02-15T10:00:00Z",
      "is_own": false
    }
  ]
}
```

**Visibility Rules:**
- Own questions (all statuses)
- Table members' `table_only` questions
- Ordered by newest first

---

### GET /api/table/questions/{question_id}

Get a specific question with all answers.

**Auth Required:** Yes
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "question_id": 999,
  "asker_user_id": 456,
  "template_id": "can_eat_safely",
  "restaurant_id": 42,
  "dietary_restriction": "celiac",
  "visibility": "table_only",
  "status": "open",
  "created_at": "2024-01-16T10:00:00Z",
  "expires_at": "2024-02-15T10:00:00Z",
  "answers": [
    {
      "answer_id": 1001,
      "answerer_user_id": 123,
      "answer_text": "Yes! I ate there last week with no issues.",
      "what_ordered": "Grilled chicken salad (no croutons)",
      "helpful": true,
      "created_at": "2024-01-16T11:00:00Z"
    }
  ],
  "is_own": false
}
```

**Error Cases:**
- `403 Forbidden`: You don't have permission to view this question
- `404 Not Found`: Question not found

---

### PUT /api/table/questions/{question_id}

Update question status (mark as answered/expired).

**Auth Required:** Yes
**Rate Limit:** None

**Request Body:**
```json
{
  "status": "answered"
}
```

**Required Fields:**
- `status` (string): One of `open`, `answered`, `expired`

**Response (200 OK):**
```json
{
  "question_id": 999,
  "status": "answered",
  "updated_at": "2024-01-16T14:00:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: Invalid status
- `403 Forbidden`: Only the question asker can update
- `404 Not Found`: Question not found

---

### DELETE /api/table/questions/{question_id}

Delete a question (soft delete - marks as expired).

**Auth Required:** Yes
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "question_id": 999,
  "deleted": true,
  "status": "expired"
}
```

**Error Cases:**
- `403 Forbidden`: Only the question asker can delete
- `404 Not Found`: Question not found

---

### POST /api/table/questions/{question_id}/answers

Answer a question from your table.

**Auth Required:** Yes
**Rate Limit:** 20 answers/day

**Request Body:**
```json
{
  "answer_text": "Yes! I ate there last week and had a great experience.",
  "what_ordered": "Grilled chicken salad without croutons"
}
```

**Required Fields:**
- `answer_text` (string): Your answer (cannot be empty)

**Optional Fields:**
- `what_ordered` (string): What you ordered

**Response (201 Created):**
```json
{
  "answer_id": 1001,
  "question_id": 999,
  "answerer_user_id": 123,
  "answer_text": "Yes! I ate there last week and had a great experience.",
  "what_ordered": "Grilled chicken salad without croutons",
  "helpful": false,
  "created_at": "2024-01-16T11:00:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: answer_text missing/empty, cannot answer your own question, question not 'open'
- `403 Forbidden`: You don't have permission to answer this question
- `404 Not Found`: Question not found
- `429 Too Many Requests`: Rate limit exceeded (20/day)

**Security Notes:**
- Cannot answer your own questions
- Can only answer questions you can see (own or table members' table_only)
- Question must have status 'open'

---

### POST /api/table/answers/{answer_id}/mark-helpful

Mark an answer as helpful (asker-only, idempotent).

**Auth Required:** Yes
**Rate Limit:** None

**Request Body:** None (empty POST)

**Response (200 OK):**
```json
{
  "answer_id": 1001,
  "helpful": true,
  "already_marked": false,
  "help_count_changed": true,
  "marked_at": "2024-01-16T12:00:00Z"
}
```

**Idempotent Response (if already marked):**
```json
{
  "answer_id": 1001,
  "helpful": true,
  "already_marked": true,
  "help_count_changed": false
}
```

**Error Cases:**
- `400 Bad Request`: Cannot mark your own answer as helpful
- `403 Forbidden`: Only the question asker can mark answers helpful
- `404 Not Found`: Answer or question not found

**Side Effects:**
- Increments `help_count` in the table connection between asker and answerer (once per answer)
- Creates a `HelpHistory` record
- Uses atomic update to prevent race conditions

---

## Phase 4: Safety Signals & Trust Scores

### POST /api/table/signals

Create a safety signal ("ate safely" report).

**Auth Required:** Yes
**Rate Limit:** 10 signals/day

**Request Body:**
```json
{
  "restaurant_id": 42,
  "restrictions_met": ["celiac", "gluten_free"],
  "dish_name": "Grilled Salmon with Vegetables",
  "what_worked": "Kitchen changed gloves and used separate prep area",
  "notes": "Server was very knowledgeable about cross-contact",
  "verification_state": "staff_verified",
  "evidence_type": "kitchen_confirmed",
  "confidence": 5,
  "visibility": "table_only",
  "attribution": "attributed"
}
```

**Required Fields:**
- `restaurant_id` (integer): Restaurant ID
- `restrictions_met` (array): List of restrictions met (e.g., `["celiac", "peanut_allergy"]`)

**Optional Fields:**
- `dish_name` (string): Name of the dish
- `what_worked` (string): What safety practices worked
- `notes` (string): Additional notes
- `verification_state` (string): One of `unverified`, `restaurant_verified`, `staff_verified`, `kitchen_confirmed` (default: `unverified`)
- `evidence_type` (string): One of `menu_label`, `server_confirmed`, `kitchen_confirmed`, `user_experience` (default: `user_experience`)
- `confidence` (integer): Confidence level 1-5 (default: 5)
- `visibility` (string): `table_only` or `private` (default: `table_only`)
- `attribution` (string): `attributed` or `anonymous` (default: `attributed`)

**Response (201 Created):**
```json
{
  "signal_id": 2001,
  "restaurant_id": 42,
  "restrictions_met": ["celiac", "gluten_free"],
  "verification_state": "staff_verified",
  "confidence": 5,
  "created_at": "2024-01-16T13:00:00Z",
  "expires_at": "2024-04-16T13:00:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: Missing required fields, invalid verification_state, invalid evidence_type, confidence out of range (1-5), invalid visibility, restrictions_met not a valid JSON array
- `404 Not Found`: Restaurant not found
- `429 Too Many Requests`: Rate limit exceeded (10/day)

**Notes:**
- Signals auto-expire after 90 days
- Confidence scale: 1 (low) to 5 (high)

---

### GET /api/table/signals

List safety signals visible to the current user.

**Auth Required:** Yes
**Rate Limit:** None

**Query Parameters:**
- `restaurant_id` (optional): Filter by restaurant ID
- `restriction_type` (optional): Filter by restriction type (e.g., "celiac")

**Response (200 OK):**
```json
{
  "signals": [
    {
      "signal_id": 2001,
      "user_id": 123,
      "restaurant_id": 42,
      "dish_name": "Grilled Salmon with Vegetables",
      "restrictions_met": ["celiac", "gluten_free"],
      "what_worked": "Kitchen changed gloves and used separate prep area",
      "notes": "Server was very knowledgeable about cross-contact",
      "verification_state": "staff_verified",
      "evidence_type": "kitchen_confirmed",
      "confidence": 5,
      "visibility": "table_only",
      "attribution": "attributed",
      "created_at": "2024-01-16T13:00:00Z",
      "expires_at": "2024-04-16T13:00:00Z",
      "is_own": true
    }
  ]
}
```

**Visibility Rules:**
- Own signals (all)
- Table members' `table_only` signals
- Excludes expired signals
- If attribution is `anonymous`, `user_id` is null
- Ordered by newest first

---

### GET /api/table/restaurants/{restaurant_id}/trust-scores

Get trust scores for a restaurant by restriction type.

**Auth Required:** Yes
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "restaurant_id": 42,
  "trust_scores": [
    {
      "restriction_type": "celiac",
      "trust_score": 0.85,
      "signal_count": 12,
      "confidence_state": "high_confidence",
      "last_signal_at": "2024-01-15T10:00:00Z",
      "calculated_at": "2024-01-16T00:00:00Z"
    },
    {
      "restriction_type": "peanut_allergy",
      "trust_score": 0.65,
      "signal_count": 4,
      "confidence_state": "medium_confidence",
      "last_signal_at": "2024-01-14T08:00:00Z",
      "calculated_at": "2024-01-16T00:00:00Z"
    }
  ]
}
```

**Error Cases:**
- `404 Not Found`: Restaurant not found

**Trust Score Fields:**
- `trust_score` (float): 0.0 to 1.0 (weighted average based on age, credibility, confidence)
- `signal_count` (integer): Number of safety signals
- `confidence_state` (string): One of:
  - `insufficient_data` (1 signal)
  - `low_confidence` (2-4 signals)
  - `medium_confidence` (5-9 signals)
  - `high_confidence` (10+ signals)
  - `conflicting_signals` (high variance in ratings)

**Trust Score Algorithm:**
- Age decay: Recent signals weighted higher (7d=1.0, 30d=0.7, 60d=0.4, 90d=0.2)
- Credibility multiplier: kitchen_confirmed=2.0x, staff_verified=1.5x, restaurant_verified=1.3x, unverified=1.0x
- Confidence multiplier: User confidence (1-5) normalized to 0.2-1.0

---

### POST /admin/calculate-trust-scores

Calculate and update restaurant trust scores (background job).

**Auth Required:** Yes
**Rate Limit:** None

**Request Body (optional):**
```json
{
  "restaurant_id": 42
}
```

**Optional Fields:**
- `restaurant_id` (integer): If provided, only recalculates for this restaurant. Otherwise recalculates all.

**Response (200 OK):**
```json
{
  "success": true,
  "created_count": 5,
  "updated_count": 18,
  "total_combinations": 23,
  "calculated_at": "2024-01-16T00:00:00Z"
}
```

**Notes:**
- This endpoint should be called by a background job (e.g., daily cron)
- Currently requires auth but could be made admin-only
- Processes all non-expired SafetySignal records
- Groups by (restaurant_id, restriction_type)
- Creates or updates RestaurantTrustScore records

---

## Phase 5: Discovery & Abuse Prevention

### GET /api/table/discovery

Discover helpful people based on past interactions.

**Auth Required:** Yes
**Rate Limit:** None

**Response (200 OK):**
```json
{
  "helpers": [
    {
      "user_id": 789,
      "display_name": "Jane Smith",
      "email": "jane@example.com",
      "bio": "Living with celiac for 10 years",
      "photo_url": "https://example.com/jane.jpg",
      "interaction_count": 5
    }
  ],
  "count": 1
}
```

**Discovery Rules:**
- Shows people who have helped YOU (answered your questions helpfully)
- Excludes people already in your table connections
- Top 10 helpers ordered by interaction count
- Based on HelpHistory records

---

### POST /api/table/reports

Report abuse (spam, inappropriate content, unsafe advice, harassment).

**Auth Required:** Yes
**Rate Limit:** None

**Request Body:**
```json
{
  "report_type": "unsafe_advice",
  "target_type": "answer",
  "answer_id": 1001,
  "reason": "This answer recommends eating at a restaurant despite known cross-contact issues"
}
```

**Required Fields:**
- `report_type` (string): One of `spam`, `inappropriate`, `unsafe_advice`, `harassment`
- `target_type` (string): One of `table_member`, `question`, `answer`, `signal`
- `reason` (string): Explanation of the report

**Target ID Fields (required based on target_type):**
- If `target_type` is `table_member`: `table_member_id` (integer)
- If `target_type` is `question`: `question_id` (integer)
- If `target_type` is `answer`: `answer_id` (integer)
- If `target_type` is `signal`: `signal_id` (integer)

**Response (201 Created):**
```json
{
  "report_id": 3001,
  "report_type": "unsafe_advice",
  "target_type": "answer",
  "status": "pending",
  "created_at": "2024-01-16T15:00:00Z"
}
```

**Error Cases:**
- `400 Bad Request`: Missing required fields, invalid report_type, invalid target_type, missing target ID for specified target_type
- `404 Not Found`: Target not found (question/answer/signal/connection)

**Notes:**
- Reports are created with status `pending`
- Admin users can view reports via GET /api/table/reports

---

### GET /api/table/reports

List abuse reports (admin only).

**Auth Required:** Yes (admin account_type=1)
**Rate Limit:** None

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `reviewed`, `actioned`)
- `report_type` (optional): Filter by report type (`spam`, `inappropriate`, `unsafe_advice`, `harassment`)

**Response (200 OK):**
```json
{
  "reports": [
    {
      "report_id": 3001,
      "reporter_user_id": 456,
      "reporter_email": "user@example.com",
      "reporter_name": "User Name",
      "report_type": "unsafe_advice",
      "target_type": "answer",
      "target_details": {
        "answer_id": 1001,
        "answerer_user_id": 789,
        "question_id": 999
      },
      "reason": "This answer recommends eating at a restaurant despite known cross-contact issues",
      "status": "pending",
      "created_at": "2024-01-16T15:00:00Z",
      "reviewed_at": null
    }
  ],
  "count": 1
}
```

**Error Cases:**
- `400 Bad Request`: Invalid status or report_type filter
- `403 Forbidden`: Not an admin user

**Notes:**
- Only accessible to admin users (account_type = 1)
- Ordered by newest first
- Includes reporter details and target details for context

---

## Error Responses

All errors follow this format:

**400 Bad Request:**
```json
{
  "message": "invitee_user_id is required"
}
```

**401 Unauthorized:**
```json
{
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "message": "Only the question asker can update the question"
}
```

**404 Not Found:**
```json
{
  "message": "Question not found"
}
```

**429 Too Many Requests:**
```json
{
  "message": "Rate limit exceeded for action: invite. Try again tomorrow."
}
```

**500 Internal Server Error:**
```json
{
  "message": "An error occurred processing your request"
}
```

---

## Security Summary

**Authentication & Authorization:**
- All endpoints require JWT authentication
- User ID extracted from JWT only (never from request body)
- Email → user_id mapping via database
- Bidirectional authorization checks (both sides of connections)
- Row-level security for questions, answers, signals

**Rate Limiting:**
- Server-side enforcement (not client-side)
- Per-user, per-action, per-day (UTC)
- Prevents abuse and spam

**Input Validation:**
- Template-only questions (no free-form posting)
- Whitelist validation for all enum fields
- Min/max constraints on text fields
- JSON schema validation for arrays

**Privacy Controls:**
- Table-scoped visibility (no public option)
- Anonymous attribution option for signals
- Soft deletes (status changes, not hard deletes)
- 90-day signal expiration

**Abuse Prevention:**
- Cannot invite yourself
- Cannot answer your own questions
- Cannot mark your own answers helpful
- Max 10 table members
- Report system for abuse
- Admin review interface

---

## Implementation Status

**Phase 2: Table Connections** - COMPLETE
- POST /api/table/invite
- POST /api/table/invite/{id}/respond
- GET /api/table/connections
- DELETE /api/table/connections/{id}

**Phase 3: Questions & Answers** - COMPLETE
- POST /api/table/questions
- GET /api/table/questions
- GET /api/table/questions/{id}
- PUT /api/table/questions/{id}
- DELETE /api/table/questions/{id}
- POST /api/table/questions/{id}/answers
- POST /api/table/answers/{id}/mark-helpful

**Phase 4: Safety Signals** - COMPLETE
- POST /api/table/signals
- GET /api/table/signals
- GET /api/table/restaurants/{id}/trust-scores
- POST /admin/calculate-trust-scores (background job)

**Phase 5: Discovery & Abuse** - COMPLETE
- GET /api/table/discovery
- POST /api/table/reports
- GET /api/table/reports (admin)

**Total Endpoints:** 18 (all implemented and tested)

---

## Database Models

**TableConnection:**
- user_id, table_member_user_id (bidirectional)
- status: invited, accepted, declined, blocked, removed
- invited_reason, help_count, connection_strength
- created_at, updated_at

**TableQuestion:**
- asker_user_id, template_id, restaurant_id
- dietary_restriction, visibility, status
- created_at, expires_at

**TableAnswer:**
- question_id, answerer_user_id
- answer_text, what_ordered, helpful
- created_at, helpful_marked_at

**SafetySignal:**
- user_id, restaurant_id
- dish_name, restrictions_met (JSON array)
- what_worked, notes
- verification_state, evidence_type, confidence
- visibility, attribution
- created_at, expires_at

**RestaurantTrustScore:**
- restaurant_id, restriction_type
- trust_score (0.0-1.0), signal_count
- confidence_state
- last_signal_at, calculated_at

**HelpHistory:**
- helped_user_id, helper_user_id
- interaction_type, question_id
- created_at

**AbuseReport:**
- reporter_user_id, report_type, target_type
- table_member_id, question_id, answer_id, signal_id
- reason, status
- created_at, reviewed_at

---

## Client Integration Examples

### JavaScript/React Example

```javascript
// Send table invite
async function sendTableInvite(inviteeUserId, reason) {
  const response = await fetch('/api/table/invite', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invitee_user_id: inviteeUserId,
      invited_reason: reason
    })
  });
  return response.json();
}

// Ask a question
async function askQuestion(restaurantId, templateId, restriction) {
  const response = await fetch('/api/table/questions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template_id: templateId,
      restaurant_id: restaurantId,
      dietary_restriction: restriction,
      visibility: 'table_only',
      expire_days: 30
    })
  });
  return response.json();
}

// Create safety signal
async function createSafetySignal(restaurantId, restrictions, dishName, notes) {
  const response = await fetch('/api/table/signals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      restaurant_id: restaurantId,
      restrictions_met: restrictions,
      dish_name: dishName,
      notes: notes,
      confidence: 5,
      verification_state: 'user_experience'
    })
  });
  return response.json();
}
```

---

**Last Updated:** 2024-01-16
**API Version:** 1.0
**Environment:** Production (SQLite: localdata.db)
