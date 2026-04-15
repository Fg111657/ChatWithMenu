#!/bin/bash
# Safe Production Deployment Script
# Ensures build succeeds before deploying to /var/www/html/

set -e  # Exit immediately if any command fails

echo "🚀 CHATWITHMENU.COM DEPLOYMENT"
echo "Time: $(date -Iseconds)"
echo "========================================================"

# Step 1: Clean previous build
echo ""
echo "📦 Step 1: Cleaning previous build..."
rm -rf build

# Step 2: Run build
echo ""
echo "🔨 Step 2: Running npm build..."
npm run build

# Build exit code is checked automatically by 'set -e'
# If build fails, script stops here

# Step 3: Validate build artifacts
echo ""
echo "✅ Step 3: Validating build artifacts..."

if [ ! -f build/index.html ]; then
    echo "❌ ERROR: build/index.html not found!"
    exit 1
fi

if [ ! -d build/static ]; then
    echo "❌ ERROR: build/static/ directory not found!"
    exit 1
fi

if [ ! -d build/static/js ]; then
    echo "❌ ERROR: build/static/js/ directory not found!"
    exit 1
fi

echo "✅ Build artifacts validated:"
ls -lh build/index.html
ls -lh build/static/js/main.*.js | head -1

# Step 4: Deploy to production
echo ""
echo "🚢 Step 4: Deploying to /var/www/html/..."
sudo rsync -a --delete build/ /var/www/html/

# Step 5: Verify deployment
echo ""
echo "🔍 Step 5: Verifying deployment..."

if [ ! -f /var/www/html/index.html ]; then
    echo "❌ ERROR: /var/www/html/index.html not found after deploy!"
    exit 1
fi

echo "✅ Deployment verified:"
ls -lh /var/www/html/index.html
ls -lh /var/www/html/static/js/main.*.js | head -1

# Step 6: Test production endpoint
echo ""
echo "🌐 Step 6: Testing production endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://chatwithmenu.com)

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Production site is responding (HTTP $HTTP_CODE)"
else
    echo "⚠️  WARNING: Production site returned HTTP $HTTP_CODE"
fi

echo ""
echo "========================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================================"
echo ""
echo "Deployed version:"
git log --oneline -1
echo ""
echo "🔗 Site: https://chatwithmenu.com"
echo ""
echo "⚠️  IMPORTANT: Run manual browser tests:"
echo "   ./verify-api.sh"
echo ""
