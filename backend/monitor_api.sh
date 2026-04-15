#!/bin/bash
#
# My Table API Health Monitor
#
# Monitors API health, server status, and database metrics
#

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:5000"
CHECK_INTERVAL=60  # seconds

clear
echo "=================================================="
echo "       My Table API Health Monitor"
echo "=================================================="
echo ""

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${TIMESTAMP}]${NC}"

    # 1. Check if server process is running
    if ps aux | grep -v grep | grep "python.*server.py" > /dev/null; then
        PID=$(ps aux | grep -v grep | grep "python.*server.py" | awk '{print $2}')
        MEM=$(ps aux | grep -v grep | grep "python.*server.py" | awk '{print $6/1024}')
        CPU=$(ps aux | grep -v grep | grep "python.*server.py" | awk '{print $3}')
        echo -e "  ${GREEN}✓${NC} Server Running (PID: $PID)"
        echo -e "    CPU: ${CPU}% | Memory: ${MEM}MB"
    else
        echo -e "  ${RED}✗${NC} Server NOT running"
    fi

    # 2. Check API endpoint response
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${API_URL}/api/table/connections 2>/dev/null)
    if [ "$HTTP_CODE" == "401" ]; then
        echo -e "  ${GREEN}✓${NC} API Responding (HTTP $HTTP_CODE - Auth required)"
    elif [ "$HTTP_CODE" == "000" ]; then
        echo -e "  ${RED}✗${NC} API Not reachable"
    else
        echo -e "  ${YELLOW}⚠${NC} API Response: HTTP $HTTP_CODE"
    fi

    # 3. Check database
    DB_PATH="/var/www/chatwithmenu/Backend/python/localdata.db"
    if [ -f "$DB_PATH" ]; then
        DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
        echo -e "  ${GREEN}✓${NC} Database exists (${DB_SIZE})"
    else
        echo -e "  ${RED}✗${NC} Database not found"
    fi

    # 4. Check cron job
    if crontab -l 2>/dev/null | grep -q "trust_scores"; then
        echo -e "  ${GREEN}✓${NC} Cron job configured"
    else
        echo -e "  ${YELLOW}⚠${NC} Cron job not configured"
    fi

    # 5. Check disk space
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "  ${GREEN}✓${NC} Disk usage: ${DISK_USAGE}%"
    else
        echo -e "  ${RED}✗${NC} Disk usage: ${DISK_USAGE}% (High!)"
    fi

    echo ""
    echo "  Press Ctrl+C to stop monitoring..."
    echo "  Next check in ${CHECK_INTERVAL}s"
    echo "=================================================="

    sleep $CHECK_INTERVAL
done
