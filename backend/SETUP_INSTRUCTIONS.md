# My Table API - Complete Setup Instructions

This guide walks you through the complete setup process for the My Table API, from installation to production deployment.

---

## 📋 Prerequisites

- Python 3.8+
- Supabase account (for authentication)
- Node.js 16+ (for frontend)
- Git configured
- Root/sudo access (for cron setup)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Installation

```bash
cd /root/chatwithmenu/Backend/python

# Check server is running
ps aux | grep "python.*server.py"

# Test endpoints
curl http://localhost:5000/api/table/connections
# Should return: {"error":"Missing Authorization header"}
```

### Step 2: Set Up Daily Trust Score Calculation

```bash
cd /var/www/chatwithmenu/Backend/python

# Run automated setup
sudo ./setup_cron_job.sh

# Or manually add to crontab:
crontab -e
# Add: 0 2 * * * cd /var/www/chatwithmenu/Backend/python && /var/www/chatwithmenu/Backend/.venv/bin/python3 cron_calculate_trust_scores.py >> /var/log/trust_scores_cron.log 2>&1
```

### Step 3: Generate Test JWT Token

```bash
python3 generate_test_token.py

# Follow prompts:
# - User ID: 1
# - Email: test@example.com
# - Expiration: 24 hours

# Copy the generated token for testing
```

### Step 4: Test API with Token

```bash
TOKEN="your-generated-token-here"

# Test connections endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/table/connections

# Should return: {"connections": []}
```

---

## 🔧 Production Setup

### 1. Environment Configuration

Create `.env` file in production directory:

```bash
cd /var/www/chatwithmenu/Backend/python
nano .env
```

Add these variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Server Configuration
FLASK_ENV=production
API_PORT=5000
DATABASE_PATH=./localdata.db

# Cron Job Authentication
TRUST_SCORE_CRON_TOKEN=your-service-account-token

# Optional: Rate Limit Overrides
RATE_LIMIT_INVITE=3
RATE_LIMIT_QUESTION=5
RATE_LIMIT_ANSWER=20
RATE_LIMIT_SIGNAL=10
```

### 2. Database Migration

```bash
cd /var/www/chatwithmenu/Backend/python

# Run migration to create My Table tables
python3 -c "
from db_models import create_all, Base
from sqlalchemy import create_engine
engine = create_engine('sqlite:///localdata.db')
create_all(engine)
print('✅ Database tables created')
"
```

Or run the migration script:

```bash
cd migrations
python3 006_my_table.py
```

### 3. Start Production Server

```bash
cd /var/www/chatwithmenu/Backend

# Start server in background
nohup /var/www/chatwithmenu/Backend/.venv/bin/python3 server.py > /tmp/server.log 2>&1 &

# Get process ID
ps aux | grep "python.*server.py" | grep -v grep

# Check logs
tail -f /tmp/server.log
```

### 4. Set Up Systemd Service (Recommended)

Create service file:

```bash
sudo nano /etc/systemd/system/mytable-api.service
```

Add:

```ini
[Unit]
Description=My Table API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/chatwithmenu/Backend
Environment="PATH=/var/www/chatwithmenu/Backend/.venv/bin"
ExecStart=/var/www/chatwithmenu/Backend/.venv/bin/python3 server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mytable-api
sudo systemctl start mytable-api
sudo systemctl status mytable-api
```

---

## 🌐 Frontend Setup

### React/TypeScript Setup

1. **Install dependencies:**

```bash
npm install @supabase/auth-helpers-react @supabase/supabase-js
```

2. **Copy integration file:**

```bash
cp /root/chatwithmenu/Backend/python/frontend_integration_example.tsx \
   your-frontend-project/src/lib/mytable-api.tsx
```

3. **Configure Supabase:**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

4. **Use the API:**

```typescript
import { useMyTableAPI, useTableConnections } from '@/lib/mytable-api';

function MyTablePage() {
  const api = useMyTableAPI();
  const { connections, loading } = useTableConnections();

  return (
    <div>
      <h1>My Table ({connections.length}/10)</h1>
      {connections.map(conn => (
        <div key={conn.connection_id}>
          <p>{conn.display_name}</p>
          <p>Helped you {conn.help_count} times</p>
        </div>
      ))}
    </div>
  );
}
```

### Vanilla JavaScript Setup

1. **Copy integration file:**

```bash
cp /root/chatwithmenu/Backend/python/frontend_integration_example.js \
   your-frontend-project/src/mytable-api.js
```

2. **Import and use:**

```javascript
import { askQuestion, getQuestions } from './mytable-api.js';

// Ask a question
const question = await askQuestion(
  123,  // restaurant_id
  'can_eat_safely',
  { dietaryRestriction: 'gluten_free' }
);

// List questions
const questions = await getQuestions({ status: 'open' });
```

---

## 🧪 Testing

### 1. Manual API Testing

```bash
# Generate token
python3 generate_test_token.py
# Copy the token

# Test all endpoints
TOKEN="your-token"

# Table Connections
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/table/connections
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"invitee_email":"friend@test.com","invited_reason":"Met at gluten-free meetup"}' \
  http://localhost:5000/api/table/invite

# Questions
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":1,"template_id":"can_eat_safely","dietary_restriction":"gluten_free"}' \
  http://localhost:5000/api/table/questions

curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/table/questions

# Safety Signals
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"restaurant_id":1,"restrictions_met":"[\"gluten_free\"]","confidence":5}' \
  http://localhost:5000/api/table/signals

# Trust Scores
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/table/restaurants/1/trust-scores
```

### 2. Automated Testing

Create test script:

```bash
cd /root/chatwithmenu/Backend/python
python3 test_discovery_abuse.py
```

### 3. Integration Testing

Use the provided test suites in the documentation.

---

## 📊 Monitoring

### 1. Check Server Health

```bash
# Check if server is running
systemctl status mytable-api

# Or manually
ps aux | grep "python.*server.py"

# Check port
netstat -tlnp | grep 5000
```

### 2. View Logs

```bash
# Server logs
tail -f /tmp/server.log

# Cron job logs
tail -f /var/log/trust_scores_cron.log

# System logs
sudo journalctl -u mytable-api -f
```

### 3. Monitor Database

```bash
# Check database size
ls -lh /var/www/chatwithmenu/Backend/python/localdata.db

# Connect to database
sqlite3 /var/www/chatwithmenu/Backend/python/localdata.db

# Check table counts
SELECT 'table_connections', COUNT(*) FROM table_connections
UNION ALL
SELECT 'table_questions', COUNT(*) FROM table_questions
UNION ALL
SELECT 'table_answers', COUNT(*) FROM table_answers
UNION ALL
SELECT 'safety_signals', COUNT(*) FROM safety_signals;
```

### 4. Monitor API Performance

Create monitoring script:

```bash
#!/bin/bash
# monitor_api.sh

while true; do
  echo "=== $(date) ==="

  # Test endpoint response time
  time curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/table/connections

  # Check process memory
  ps aux | grep "python.*server.py" | grep -v grep | awk '{print "Memory: " $6/1024 "MB"}'

  echo ""
  sleep 60
done
```

---

## 🔒 Security Checklist

### Production Security

- [ ] Change JWT_SECRET_KEY in .env
- [ ] Enable HTTPS (use nginx reverse proxy)
- [ ] Set up CORS properly
- [ ] Configure firewall (allow only port 443)
- [ ] Set up rate limiting at nginx level
- [ ] Enable SQL injection protection (already done via ORM)
- [ ] Regular database backups
- [ ] Monitor for abuse reports
- [ ] Set up error tracking (Sentry, etc.)

### Authentication

- [ ] Supabase JWT configured
- [ ] Test token expiration
- [ ] Verify user_id extraction from JWT
- [ ] No user_id in request bodies (security)

### Rate Limiting

- [ ] Verify rate limits are working
- [ ] Monitor rate limit violations
- [ ] Adjust limits if needed

---

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
netstat -tlnp | grep 5000

# Kill existing process
pkill -f "python.*server.py"

# Check Python environment
/var/www/chatwithmenu/Backend/.venv/bin/python3 --version

# Check for syntax errors
python3 -m py_compile server.py
```

### Database Errors

```bash
# Check database permissions
ls -la localdata.db

# Recreate database
rm localdata.db
python3 -c "from db_models import create_all; create_all(engine)"
```

### Authentication Failing

```bash
# Verify JWT secret matches Supabase
grep JWT_SECRET .env

# Test with generated token
python3 generate_test_token.py

# Check Supabase configuration
curl https://your-project.supabase.co/auth/v1/.well-known/jwks.json
```

### Cron Job Not Running

```bash
# Check crontab
crontab -l | grep trust_scores

# Test manually
cd /var/www/chatwithmenu/Backend/python
python3 cron_calculate_trust_scores.py

# Check environment variable
echo $TRUST_SCORE_CRON_TOKEN
```

---

## 📚 Additional Resources

### Documentation
- **API Reference:** `MY_TABLE_API.md`
- **Quick Reference:** `MY_TABLE_QUICK_REFERENCE.md`
- **Deployment Guide:** `DEPLOYMENT_COMPLETE.md`

### Code Examples
- **React/TypeScript:** `frontend_integration_example.tsx`
- **Vanilla JavaScript:** `frontend_integration_example.js`

### Support
- **GitHub Issues:** [Report bugs](https://github.com/ChatWithMenu/Backend/issues)
- **Documentation:** All docs in `/root/chatwithmenu/Backend/python/`

---

## ✅ Post-Setup Verification

Run this checklist after setup:

```bash
# 1. Server is running
ps aux | grep "python.*server.py" | grep -v grep && echo "✅ Server running"

# 2. Database exists
[ -f /var/www/chatwithmenu/Backend/python/localdata.db ] && echo "✅ Database exists"

# 3. Endpoints respond
curl -s http://localhost:5000/api/table/connections | grep -q "Missing Authorization" && echo "✅ Endpoints responding"

# 4. Cron job configured
crontab -l | grep -q "trust_scores" && echo "✅ Cron job configured"

# 5. Documentation available
[ -f MY_TABLE_API.md ] && echo "✅ Documentation available"
```

---

## 🎉 You're Done!

Your My Table API is now fully configured and ready for production use!

**Next Steps:**
1. Start building your frontend UI
2. Test with real users
3. Monitor logs and performance
4. Iterate based on feedback

**Happy coding! 🚀**
