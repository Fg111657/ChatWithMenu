#!/bin/bash
echo "🧪 Testing My Table Routes..."
echo ""

# Check files exist
echo "📁 Checking files..."
test -f src/screens/MyTableScreen.js && echo "✅ MyTableScreen.js exists" || echo "❌ MyTableScreen.js missing"
test -f src/screens/TableQuestionsScreen.js && echo "✅ TableQuestionsScreen.js exists" || echo "❌ TableQuestionsScreen.js missing"
test -f src/screens/SafetySignalsScreen.js && echo "✅ SafetySignalsScreen.js exists" || echo "❌ SafetySignalsScreen.js missing"
test -f src/components/TrustScoreBadge.jsx && echo "✅ TrustScoreBadge.jsx exists" || echo "❌ TrustScoreBadge.jsx missing"
echo ""

# Check routes in App.js
echo "🧭 Checking routes in App.js..."
grep -q "/my-table" src/App.js && echo "✅ /my-table route added" || echo "❌ /my-table route missing"
grep -q "/table-questions" src/App.js && echo "✅ /table-questions route added" || echo "❌ /table-questions route missing"
grep -q "/safety-signals" src/App.js && echo "✅ /safety-signals route added" || echo "❌ /safety-signals route missing"
echo ""

# Check navigation
echo "📱 Checking navigation..."
grep -q "My Table" src/NavBarLayout.js && echo "✅ My Table in navigation" || echo "❌ My Table navigation missing"
grep -q "GroupsIcon" src/NavBarLayout.js && echo "✅ GroupsIcon imported" || echo "❌ GroupsIcon missing"
echo ""

# Check dataService methods
echo "🔌 Checking API methods..."
grep -q "sendTableInvite" src/services/dataService.js && echo "✅ sendTableInvite added" || echo "❌ sendTableInvite missing"
grep -q "getTableConnections" src/services/dataService.js && echo "✅ getTableConnections added" || echo "❌ getTableConnections missing"
grep -q "askTableQuestion" src/services/dataService.js && echo "✅ askTableQuestion added" || echo "❌ askTableQuestion missing"
grep -q "createSafetySignal" src/services/dataService.js && echo "✅ createSafetySignal added" || echo "❌ createSafetySignal missing"
grep -q "getRestaurantTrustScores" src/services/dataService.js && echo "✅ getRestaurantTrustScores added" || echo "❌ getRestaurantTrustScores missing"
echo ""

# Check TrustScoreBadge in RestaurantDetailsDialog
echo "🏅 Checking TrustScoreBadge integration..."
grep -q "TrustScoreBadge" src/components/RestaurantDetailsDialog.jsx && echo "✅ TrustScoreBadge integrated" || echo "❌ TrustScoreBadge not integrated"
echo ""

echo "✨ Test complete! Check results above."
