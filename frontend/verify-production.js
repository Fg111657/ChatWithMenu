#!/usr/bin/env node
/**
 * Phase 3.0 Production Verification Script
 * Tests the complete data flow: API → Parser → V2 Schema
 */

const http = require('http');

// Import parser (we'll use the test helpers)
const { parseMenuText } = require('./src/screens/menuParserHelpers');

function fetchRestaurant(id) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost/api/restaurant/${id}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verifyRestaurant(id, name, checks) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name} (ID: ${id})`);
  console.log('='.repeat(60));

  try {
    const restaurant = await fetchRestaurant(id);

    // Parse menu data
    if (!restaurant.menus || restaurant.menus.length === 0) {
      console.log('❌ No menus found');
      return false;
    }

    const menuData = restaurant.menus[0].menu_data;
    const parsed = parseMenuText(menuData);

    console.log(`\n📊 Parse Results:`);
    console.log(`   Menus: ${parsed.menus.length}`);
    console.log(`   Categories: ${parsed.menus[0].categories.length}`);
    console.log(`   Total Items: ${parsed.menus[0].categories.reduce((sum, cat) => sum + cat.items.length, 0)}`);

    // Run custom checks
    let allPassed = true;
    for (const check of checks) {
      const result = check(parsed, restaurant);
      console.log(`   ${result.passed ? '✅' : '❌'} ${result.message}`);
      if (!result.passed) {
        allPassed = false;
        if (result.details) {
          console.log(`      ${result.details}`);
        }
      }
    }

    // List categories
    console.log(`\n📁 Categories:`);
    parsed.menus[0].categories.forEach((cat, i) => {
      console.log(`   ${i + 1}. ${cat.name} (${cat.items.length} items)`);
    });

    // Check for MP items
    const mpItems = [];
    parsed.menus[0].categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.price_type === 'MP') {
          mpItems.push({ category: cat.name, item: item.name });
        }
      });
    });

    if (mpItems.length > 0) {
      console.log(`\n💵 Market Price Items (${mpItems.length}):`);
      mpItems.forEach(({ category, item }) => {
        console.log(`   - ${item} (${category})`);
      });
    }

    return allPassed;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🔍 PHASE 3.0 PRODUCTION VERIFICATION');
  console.log('Testing: chatwithmenu.com');
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = [];

  // Test 1: El Mitote (ID 11)
  results.push(await verifyRestaurant(11, 'El Mitote Antojeria', [
    (parsed) => {
      const catNames = parsed.menus[0].categories.map(c => c.name);
      const hasCategories = catNames.length > 0 && !catNames.includes('Uncategorized');
      return {
        passed: hasCategories,
        message: 'Categories render correctly (not "sections")',
        details: hasCategories ? null : `Found: ${catNames.join(', ')}`
      };
    },
    (parsed) => {
      const items = parsed.menus[0].categories.flatMap(c => c.items);
      const badItems = items.filter(i => i.name.startsWith('Item:') || i.name === 'Item');
      return {
        passed: badItems.length === 0,
        message: 'Items have proper names (not "Item:")',
        details: badItems.length > 0 ? `Found ${badItems.length} items with "Item:" prefix` : null
      };
    },
    (parsed) => {
      const items = parsed.menus[0].categories.flatMap(c => c.items);
      const zeroItems = items.filter(i => i.price === 0 && i.price_type !== 'MP');
      return {
        passed: zeroItems.length === 0,
        message: 'No $0 prices for MP items',
        details: zeroItems.length > 0 ? `Found ${zeroItems.length} items with price $0` : null
      };
    }
  ]));

  // Test 2: Burger Queens (ID 4)
  results.push(await verifyRestaurant(4, 'Burger Queens', [
    (parsed) => {
      const items = parsed.menus[0].categories.flatMap(c => c.items);
      const hasDescriptions = items.every(i => i.description && i.description.length > 0);
      return {
        passed: hasDescriptions,
        message: 'Descriptions not split into fake items',
        details: hasDescriptions ? null : 'Some items missing descriptions'
      };
    }
  ]));

  // Test 3: Full Moon Cafe (ID 6)
  results.push(await verifyRestaurant(6, 'Full Moon Cafe', [
    (parsed) => {
      const items = parsed.menus[0].categories.flatMap(c => c.items);
      const hasDescriptions = items.every(i => i.description && i.description.length > 0);
      return {
        passed: hasDescriptions,
        message: 'Descriptions not split into fake items',
        details: hasDescriptions ? null : 'Some items missing descriptions'
      };
    }
  ]));

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`\n${passed}/${total} restaurants passed all checks`);

  if (passed === total) {
    console.log('\n✅ All smoke tests PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Some smoke tests FAILED');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
