#!/usr/bin/env python3
"""Audit all menus to see completeness"""

import db_models, json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

restaurants = session.query(db_models.Restaurant).all()

print('MENU DATA AUDIT - All Restaurants:')
print('=' * 80)

for restaurant in restaurants:
    if not restaurant.menus:
        print(f'{restaurant.name:30s} | ❌ ERROR | No menu found')
        continue

    menu = restaurant.menus[0]

    try:
        data = json.loads(menu.menu_data)

        item_count = sum(len(cat['items']) for m in data['menus'] for cat in m['categories'])
        cat_count = sum(len(m['categories']) for m in data['menus'])
        raw_len = len(data.get('raw_input', ''))

        # Check if minimal menu (placeholder)
        is_minimal = False
        if item_count == 1:
            first_item = data['menus'][0]['categories'][0]['items'][0]
            if 'Failed Auto-Parse' in first_item.get('name', ''):
                is_minimal = True

        status = '⚠️ MINIMAL' if is_minimal else '✅ PARSED'

        print(f'{restaurant.name:30s} | {status} | {item_count:3d} items | {cat_count} cats | raw: {raw_len:5d} chars')

    except json.JSONDecodeError as e:
        print(f'{restaurant.name:30s} | ❌ ERROR | Invalid JSON: {str(e)[:50]}')
    except Exception as e:
        print(f'{restaurant.name:30s} | ❌ ERROR | {str(e)[:50]}')

session.close()
