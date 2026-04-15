#!/usr/bin/env python3
"""Comprehensive review of all restaurant menus before committing"""

import db_models, json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

restaurants = session.query(db_models.Restaurant).all()

print('=' * 80)
print('COMPREHENSIVE MENU REVIEW - ALL RESTAURANTS')
print('=' * 80)

issues_found = []
total_restaurants = len(restaurants)
total_items = 0

for restaurant in restaurants:
    print(f'\n{"=" * 80}')
    print(f'{restaurant.name} (ID: {restaurant.id})')
    print('=' * 80)

    # Check if menu exists
    if not restaurant.menus:
        print('❌ ERROR: No menu found!')
        issues_found.append(f'{restaurant.name}: No menu')
        continue

    menu = restaurant.menus[0]

    # Validate JSON
    try:
        data = json.loads(menu.menu_data)
    except json.JSONDecodeError as e:
        print(f'❌ ERROR: Invalid JSON - {str(e)[:100]}')
        issues_found.append(f'{restaurant.name}: Invalid JSON')
        continue

    # Check version
    version = data.get('version')
    print(f'✓ Version: {version}')

    if version != 2:
        print(f'  ⚠️  WARNING: Not V2 format')
        issues_found.append(f'{restaurant.name}: Not V2 format')

    # Check structure
    if 'menus' not in data:
        print('❌ ERROR: Missing "menus" field')
        issues_found.append(f'{restaurant.name}: Missing menus field')
        continue

    # Count items and categories
    item_count = 0
    cat_count = 0
    price_count = 0
    mp_count = 0
    items_without_names = 0
    items_without_descriptions = 0

    for m in data.get('menus', []):
        for cat in m.get('categories', []):
            cat_count += 1
            for item in cat.get('items', []):
                item_count += 1

                # Check item has name
                if not item.get('name'):
                    items_without_names += 1

                # Check description
                if not item.get('description'):
                    items_without_descriptions += 1

                # Count prices
                if item.get('price') is not None:
                    price_count += 1
                elif item.get('price_type') == 'MP':
                    mp_count += 1

    total_items += item_count

    print(f'✓ Items: {item_count}')
    print(f'✓ Categories: {cat_count}')
    print(f'✓ Items with fixed prices: {price_count}')
    print(f'✓ Items with market price (MP): {mp_count}')
    print(f'✓ Raw input length: {len(data.get("raw_input", ""))} chars')

    # Check for issues
    if items_without_names > 0:
        print(f'❌ ERROR: {items_without_names} items without names!')
        issues_found.append(f'{restaurant.name}: {items_without_names} items without names')

    if item_count == 0:
        print('⚠️  WARNING: No items in menu!')
        issues_found.append(f'{restaurant.name}: No items')

    if item_count == 1:
        # Check if it's a placeholder
        first_item = data['menus'][0]['categories'][0]['items'][0]
        if 'Failed Auto-Parse' in first_item.get('name', ''):
            print('⚠️  WARNING: Placeholder menu (Failed Auto-Parse)')
            issues_found.append(f'{restaurant.name}: Placeholder menu')

    # Show sample items (first 5)
    print(f'\nSample items:')
    sample_count = 0
    for m in data['menus']:
        for cat in m['categories']:
            print(f'  [{cat["name"]}]')
            for item in cat['items'][:3]:
                name = item.get('name', '(no name)')
                price = item.get('price')
                price_type = item.get('price_type', 'FIXED')

                if price is not None:
                    price_str = f'${price}'
                elif price_type == 'MP':
                    price_str = 'MP'
                else:
                    price_str = '(no price)'

                desc_preview = item.get('description', '')[:50]
                if len(item.get('description', '')) > 50:
                    desc_preview += '...'

                print(f'    - {name} ({price_str})')
                if desc_preview:
                    print(f'      {desc_preview}')

                sample_count += 1
                if sample_count >= 5:
                    break
            if sample_count >= 5:
                break
        if sample_count >= 5:
            break

    # Check documents
    print(f'\nDocuments:')
    if restaurant.documents:
        for doc in restaurant.documents:
            doc_len = len(doc.document_data)
            print(f'  - {doc.document_type}: {doc_len} chars')
    else:
        print('  (none)')

print('\n' + '=' * 80)
print('REVIEW SUMMARY')
print('=' * 80)
print(f'Total restaurants: {total_restaurants}')
print(f'Total menu items: {total_items}')
print(f'Issues found: {len(issues_found)}')

if issues_found:
    print('\n⚠️  ISSUES DETECTED:')
    for issue in issues_found:
        print(f'  - {issue}')
else:
    print('\n✅ NO ISSUES DETECTED - ALL RESTAURANTS LOOK GOOD!')

print('=' * 80)

session.close()
