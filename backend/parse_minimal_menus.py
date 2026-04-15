#!/usr/bin/env python3
"""Parse the 2 minimal menus from their raw_input fields"""

import db_models, json, re, uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

def parse_structured_menu(raw_text):
    """Parse menu with 'Item:', 'Price:', 'Ingr.:' format"""
    categories = []
    current_category = None
    current_item = {}

    lines = raw_text.split('\n')

    for line in lines:
        line = line.strip()

        # Category header (lines without Item/Price/Ingr prefix, and not empty)
        if line and not line.startswith('Item:') and not line.startswith('Price:') and not line.startswith('Ingr.:'):
            # Save previous item if exists
            if current_item.get('name'):
                if current_category:
                    current_category['items'].append(current_item)
                current_item = {}

            # New category
            # Clean emoji and special chars from category name
            category_name = re.sub(r'[🍔🍟🥤🧃🥛🍕🌮🥗🍖🍗🍤🎂🍰🧀]', '', line).strip()

            current_category = {
                'id': str(uuid.uuid4()),
                'name': category_name if category_name else 'Menu Items',
                'display_order': len(categories) + 1,
                'items': []
            }
            categories.append(current_category)

        # Item name
        elif line.startswith('Item:'):
            # If no category exists yet, create a default one
            if not current_category:
                current_category = {
                    'id': str(uuid.uuid4()),
                    'name': 'Menu Items',
                    'display_order': 1,
                    'items': []
                }
                categories.append(current_category)

            # Save previous item
            if current_item.get('name'):
                if current_category:
                    current_category['items'].append(current_item)

            item_name = line.replace('Item:', '').strip()
            current_item = {
                'id': str(uuid.uuid4()),
                'name': item_name,
                'description': '',
                'price': None,
                'price_type': 'FIXED',
                'source': 'parsed_from_raw_input',
                'display_order': 1,
                'allergens': [],
                'dietary_tags': [],
                'prep_methods': [],
                'modifiers': [],
                'modifier_groups': [],
                'removable_ingredients': [],
                'needs_review': False,
                'review_reasons': []
            }

        # Price
        elif line.startswith('Price:'):
            price_text = line.replace('Price:', '').strip()
            # Extract number from $9, $10.99, etc.
            price_match = re.search(r'\$?(\d+\.?\d*)', price_text)
            if price_match:
                current_item['price'] = float(price_match.group(1))
                current_item['price_type'] = 'FIXED'

        # Ingredients
        elif line.startswith('Ingr.:'):
            ingredients = line.replace('Ingr.:', '').strip()
            current_item['description'] = ingredients

    # Save last item
    if current_item.get('name') and current_category:
        current_category['items'].append(current_item)

    # Update display_order for items in each category
    for cat in categories:
        for idx, item in enumerate(cat['items'], 1):
            item['display_order'] = idx

    return categories

def recover_minimal_menu(restaurant_id, restaurant_name):
    """Recover a minimal menu from raw_input"""
    menu = session.query(db_models.MenuDetail).get(restaurant_id)
    data = json.loads(menu.menu_data)

    raw_input = data.get('raw_input', '')

    if not raw_input or len(raw_input) < 100:
        print(f'  ❌ No raw_input data to recover')
        return False

    print(f'  Parsing {len(raw_input)} chars of raw_input...')

    # Parse the structured format
    categories = parse_structured_menu(raw_input)

    if not categories:
        print(f'  ❌ Failed to parse any categories')
        return False

    # Create V2 menu
    v2_menu = {
        'version': 2,
        'currency': 'USD',
        'language': 'en',
        'updated_at': '',
        'raw_input': raw_input,  # Preserve original
        'menus': [
            {
                'id': str(uuid.uuid4()),
                'name': 'Menu',
                'display_order': 1,
                'categories': categories
            }
        ],
        'specials': [],
        'upsell_tips': []
    }

    total_items = sum(len(cat['items']) for cat in categories)

    print(f'  ✅ Parsed {len(categories)} categories, {total_items} items')

    # Update database
    menu.menu_data = json.dumps(v2_menu, indent=2)
    session.add(menu)
    session.commit()

    return True

# Process the 2 minimal menus
print('Recovering minimal menus from raw_input:')
print('=' * 80)

minimal_menus = [
    (4, 'Burger Queens'),
    (10, 'Campus Deli')
]

for menu_id, name in minimal_menus:
    print(f'\n{name} (ID: {menu_id})')
    success = recover_minimal_menu(menu_id, name)

print('\n' + '=' * 80)
print('Recovery complete!')

session.close()
