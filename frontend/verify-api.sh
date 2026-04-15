#!/bin/bash
# Phase 3.0 API Verification Script

echo "🔍 PHASE 3.0 PRODUCTION VERIFICATION"
echo "Testing: chatwithmenu.com API"
echo "Time: $(date -Iseconds)"
echo ""
echo "========================================================"

# Test El Mitote
echo "Testing: El Mitote Antojeria (ID: 11)"
echo "========================================================"

RESPONSE=$(curl -s http://localhost/api/restaurant/11)
echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ API responds with valid JSON')
    print(f'   Name: {data[\"name\"]}')
    print(f'   Menus: {len(data[\"menus\"])}')
    if data['menus']:
        menu_data = data['menus'][0]['menu_data']
        print(f'   Menu data length: {len(menu_data)} chars')
        # Check for categories
        if 'LAS BOTANAS' in menu_data:
            print('✅ Contains expected category: LAS BOTANAS')
        if 'LOS ANTOJITOS' in menu_data:
            print('✅ Contains expected category: LOS ANTOJITOS')
        # Check for MP items
        if 'MARKET PRICE' in menu_data or ' MP' in menu_data:
            print('✅ Contains Market Price items')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

echo ""
echo "--------------------------------------------------------"
echo "Testing: Burger Queens (ID: 4)"
echo "--------------------------------------------------------"

RESPONSE=$(curl -s http://localhost/api/restaurant/4)
echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ API responds with valid JSON')
    print(f'   Name: {data[\"name\"]}')
    print(f'   Menus: {len(data[\"menus\"])}')
    if data['menus']:
        menu_data = data['menus'][0]['menu_data']
        print(f'   Menu data length: {len(menu_data)} chars')
        # Check for structured format
        if 'Item:' in menu_data and 'Price:' in menu_data and 'Ingr.:' in menu_data:
            print('✅ Uses structured format (Item:/Price:/Ingr.:)')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

echo ""
echo "--------------------------------------------------------"
echo "Testing: Full Moon Cafe (ID: 6)"
echo "--------------------------------------------------------"

RESPONSE=$(curl -s http://localhost/api/restaurant/6)
echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ API responds with valid JSON')
    print(f'   Name: {data[\"name\"]}')
    print(f'   Menus: {len(data[\"menus\"])}')
    if data['menus']:
        menu_data = data['menus'][0]['menu_data']
        print(f'   Menu data length: {len(menu_data)} chars')
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
"

echo ""
echo "========================================================"
echo "BACKEND STATUS"
echo "========================================================"

# Check backend is running
if pgrep -f "python server.py" > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is NOT running"
fi

# Check nginx is running
if pgrep nginx > /dev/null; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is NOT running"
fi

echo ""
echo "========================================================"
echo "DEPLOYMENT STATUS"
echo "========================================================"

# Check git status
cd /root/cwm-frontend-react
echo "Git commits:"
git log --oneline -3
echo ""
echo "Remote status:"
git status -sb

echo ""
echo "Build deployed:"
ls -lh /var/www/html/index.html 2>/dev/null || echo "❌ No index.html found"
ls -lh /var/www/html/static/js/main.*.js 2>/dev/null | head -1 || echo "❌ No main.js found"

echo ""
echo "========================================================"
echo "✅ API VERIFICATION COMPLETE"
echo "========================================================"
echo ""
echo "NEXT STEPS - Manual Browser Testing Required:"
echo ""
echo "1. Open: https://chatwithmenu.com"
echo "2. Test El Mitote menu:"
echo "   - Categories should show (LAS BOTANAS, LOS ANTOJITOS, etc.)"
echo "   - Items should have proper names (not 'Item:')"
echo "   - MP items should show 'MP' not \$0"
echo ""
echo "3. Test MenuManager (requires login):"
echo "   - Edit an item"
echo "   - Toggle price type to MP"
echo "   - Save and refresh"
echo "   - Verify changes persist"
echo ""
echo "4. Test ServerDashboard:"
echo "   - Allergens appear FIRST in bold red"
echo "   - Prep methods visible"
echo "   - MP shows 'MP' not \$0"
echo ""
echo "5. Check browser console for errors"
echo ""
