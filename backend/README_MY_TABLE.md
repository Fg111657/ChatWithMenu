# My Table API - Documentation Index

Complete documentation for the My Table social trust infrastructure (RALPH Framework).

---

## Quick Links

### For Developers
- **Quick Reference:** [MY_TABLE_QUICK_REFERENCE.md](MY_TABLE_QUICK_REFERENCE.md) - Start here for common use cases and code examples

### For Integration
- **API Reference:** [MY_TABLE_API.md](MY_TABLE_API.md) - Complete endpoint documentation with examples

### For Project Management
- **Completion Summary:** [MY_TABLE_COMPLETION_SUMMARY.md](MY_TABLE_COMPLETION_SUMMARY.md) - Implementation status and metrics
- **Task Verification:** [TASK_5_VERIFICATION.md](TASK_5_VERIFICATION.md) - Test results and validation

---

## Documentation Files

| File | Size | Description |
|------|------|-------------|
| MY_TABLE_API.md | 25K | Complete API reference (18 endpoints) |
| MY_TABLE_COMPLETION_SUMMARY.md | 14K | Phase implementation summary |
| MY_TABLE_QUICK_REFERENCE.md | 8.1K | Developer quick reference |
| TASK_5_VERIFICATION.md | 9.2K | Testing verification report |

**Total Documentation:** 56.3K (4 files)

---

## Implementation Status

**Phase 2: Table Connections** - COMPLETE (4 endpoints)
**Phase 3: Questions & Answers** - COMPLETE (7 endpoints)
**Phase 4: Safety Signals & Trust Scores** - COMPLETE (4 endpoints)
**Phase 5: Discovery & Abuse Prevention** - COMPLETE (3 endpoints)

**Total:** 18 endpoints implemented and tested

---

## Quick Start

### 1. Authentication
All endpoints require JWT token:
```bash
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:5000/api/table/connections
```

### 2. Send Invitation
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invitee_user_id": 123, "invited_reason": "Met at support group"}' \
  http://localhost:5000/api/table/invite
```

### 3. Ask Question
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "can_eat_safely", "restaurant_id": 42, "dietary_restriction": "celiac"}' \
  http://localhost:5000/api/table/questions
```

### 4. Create Safety Signal
```bash
curl -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": 42, "restrictions_met": ["celiac"], "confidence": 5}' \
  http://localhost:5000/api/table/signals
```

For more examples, see [MY_TABLE_QUICK_REFERENCE.md](MY_TABLE_QUICK_REFERENCE.md)

---

## Architecture

### RALPH Framework
- **R**eputation: help_count, trust_scores, connection_strength
- **A**ttribution: invited_reason, verification_states, evidence_types
- **L**imitation: Max 10 table members, rate limits, 90-day expiration
- **P**rivacy: Table-scoped visibility, anonymous signals, soft deletes
- **H**uman-scale: Small trusted tables, structured questions, invitation reasons

### Security Features
- JWT authentication on all endpoints
- User ID from JWT only (never from request body)
- Server-side rate limiting (atomic operations)
- Input validation and sanitization
- Bidirectional authorization checks
- Audit logging

### Database Models
- TableConnection (bidirectional relationships)
- TableQuestion (template-based)
- TableAnswer (with helpful tracking)
- SafetySignal (with expiration)
- RestaurantTrustScore (calculated)
- HelpHistory (discovery data)
- AbuseReport (moderation)
- RateLimit (daily windows)

---

## Testing

### Authentication Tests
All 17 unique endpoint paths require authentication:
```
✓ 17/17 endpoints return 401 without auth
```

### Rate Limiting
All 4 action types configured with atomic operations:
```
✓ invite: 3/day
✓ question: 5/day
✓ answer: 20/day
✓ signal: 10/day
```

### Production Status
```
✓ Server running (PID: 283229)
✓ Database operational (localdata.db)
✓ All endpoints responding
✓ Migrations applied
```

---

## Next Steps

### Optional Enhancements
1. Background job for trust score calculation (endpoint exists, needs cron)
2. Email notifications for invitations and answers
3. Analytics dashboard
4. Mobile API optimization (pagination, field filtering)
5. Admin moderation tools

### Frontend Integration
Ready for frontend development. All endpoints documented with examples.

---

## Support

**Documentation:** See files above
**Server Logs:** systemd journal
**Database:** /var/www/chatwithmenu/Backend/python/localdata.db
**API Base URL:** http://localhost:5000/api/table

---

## Version History

**v1.0** - January 16, 2024
- All 18 endpoints implemented
- Complete documentation
- Production deployment
- Security testing complete

---

**Last Updated:** January 16, 2024
**Status:** Production Ready
**Maintainer:** ChatWithMenu Team
