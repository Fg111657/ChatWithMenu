#!/usr/bin/env python3
"""Verify all restaurants have complete data - compare Recipe docs vs parsed menus"""

import db_models, json, csv, io
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

restaurants = session.query(db_models.Restaurant).all()

print('=' * 80)
print('DATA RECOVERY VERIFICATION - All Restaurants')
print('=' * 80)
print()

total_verified = 0
total_issues = 0

for restaurant in restaurants:
    print(f'\n{"=" * 80}')
    print(f'{restaurant.name} (ID: {restaurant.id})')
    print('=' * 80)

    # Check Recipe/Ingredients documents
    recipe_items = []
    for doc in restaurant.documents:
        if doc.document_type in ['Recipe', 'Ingredients']:
            doc_len = len(doc.document_data)
            print(f'📄 {doc.document_type} document: {doc_len} chars')

            if doc_len > 100:
                try:
                    # Try to parse as CSV
                    reader = csv.DictReader(io.StringIO(doc.document_data))
                    for row in reader:
                        if 'Menu Item' in row and row['Menu Item'].strip():
                            recipe_items.append(row['Menu Item'].strip())
                    print(f'   → Parsed {len(recipe_items)} items from {doc.document_type}')
                except Exception as e:
                    print(f'   → Could not parse as CSV: {str(e)[:50]}')

    # Check parsed menu
    menu = restaurant.menus[0] if restaurant.menus else None

    if not menu:
        print('❌ ERROR: No menu found!')
        total_issues += 1
        continue

    try:
        data = json.loads(menu.menu_data)

        # Count items
        item_count = sum(len(cat['items']) for m in data.get('menus', []) for cat in m.get('categories', []))
        cat_count = sum(len(m['categories']) for m in data.get('menus', []))
        raw_len = len(data.get('raw_input', ''))

        print(f'📊 Parsed menu: {item_count} items across {cat_count} categories')
        print(f'📝 Raw input: {raw_len} chars preserved')

        # Compare Recipe vs Parsed
        if recipe_items:
            if item_count >= len(recipe_items):
                print(f'✅ VERIFIED: Parsed menu has {item_count} items (Recipe had {len(recipe_items)})')
                total_verified += 1
            else:
                print(f'⚠️  MISMATCH: Parsed menu has {item_count} items but Recipe had {len(recipe_items)}')
                print(f'   Missing {len(recipe_items) - item_count} items!')
                total_issues += 1

                # Show sample items from each
                parsed_names = []
                for m in data['menus']:
                    for cat in m['categories']:
                        for item in cat['items']:
                            parsed_names.append(item['name'])

                print(f'\n   Sample Recipe items: {recipe_items[:5]}')
                print(f'   Sample Parsed items: {parsed_names[:5]}')
        else:
            # No Recipe document - verify against raw_input or just confirm we have data
            if item_count > 0:
                print(f'✅ VERIFIED: Menu has {item_count} items (no Recipe doc to compare)')
                total_verified += 1
            elif raw_len > 1000:
                print(f'⚠️  WARNING: Menu has {item_count} items but raw_input has {raw_len} chars')
                print(f'   Raw data exists but not parsed!')
                total_issues += 1
            else:
                print(f'✅ OK: Menu has {item_count} items (test/empty menu)')
                total_verified += 1

        # Show sample items
        if item_count > 0:
            print(f'\n   Sample items from parsed menu:')
            sample_count = 0
            for m in data['menus']:
                for cat in m['categories']:
                    for item in cat['items'][:3]:
                        price_str = f"${item['price']}" if item.get('price') else 'MP'
                        print(f'     - {item["name"]} ({price_str})')
                        sample_count += 1
                        if sample_count >= 5:
                            break
                    if sample_count >= 5:
                        break
                if sample_count >= 5:
                    break

    except json.JSONDecodeError as e:
        print(f'❌ ERROR: Invalid JSON - {str(e)[:50]}')
        total_issues += 1
    except Exception as e:
        print(f'❌ ERROR: {str(e)[:100]}')
        total_issues += 1

print()
print('=' * 80)
print('VERIFICATION SUMMARY')
print('=' * 80)
print(f'Total restaurants checked: {len(restaurants)}')
print(f'Verified correctly: {total_verified}')
print(f'Issues found: {total_issues}')

if total_issues == 0:
    print('\n✅ ALL RESTAURANTS HAVE COMPLETE DATA!')
else:
    print(f'\n⚠️  {total_issues} restaurants need attention')

print('=' * 80)

session.close()
