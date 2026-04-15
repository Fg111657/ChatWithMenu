#!/usr/bin/env python3
"""Recover COMPLETE El Mitote menu from chat database - all items with prices"""

import db_models, json, uuid, re
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

# Get the menu text from chat #50
chat = session.execute(text('SELECT conversation_data FROM chats WHERE id = 50')).fetchone()
conv_data = chat[0]

# Parse JSON to get menu
messages = json.loads(conv_data)
menu_text = None

for msg in messages:
    if msg['role'] == 'system' and 'LAS BOTANAS' in msg['content']:
        content = msg['content']
        menu_start = content.find('```\n') + 4
        menu_end = content.find('```\n\n## Ingredients')
        menu_text = content[menu_start:menu_end]
        break

if not menu_text:
    print('ERROR: Could not find menu in chat')
    exit(1)

# Parse the menu
categories_data = []
current_category = None
current_item = None

lines = menu_text.split('\n')

for line in lines:
    line_stripped = line.strip()

    if not line_stripped or line_stripped == '⸻':
        continue

    # Category headers (lines without Item:/Price:/Ingr.: prefix)
    if not line_stripped.startswith('Item:') and not line_stripped.startswith('Price:') and not line_stripped.startswith('Ingr.:'):
        # Save previous item
        if current_item and current_category:
            current_category['items'].append(current_item)
            current_item = None

        # New category
        current_category = {
            'name': line_stripped,
            'items': []
        }
        categories_data.append(current_category)

    # Item name
    elif line_stripped.startswith('Item:'):
        # Save previous item
        if current_item and current_category:
            current_category['items'].append(current_item)

        item_name = line_stripped.replace('Item:', '').strip()
        current_item = {
            'name': item_name,
            'price': None,
            'description': ''
        }

    # Price
    elif line_stripped.startswith('Price:') and current_item:
        price_text = line_stripped.replace('Price:', '').strip()
        price_match = re.search(r'\$(\d+)', price_text)
        if price_match:
            current_item['price'] = float(price_match.group(1))

    # Ingredients
    elif line_stripped.startswith('Ingr.:') and current_item:
        ingredients = line_stripped.replace('Ingr.:', '').strip()
        current_item['description'] = ingredients

# Save last item
if current_item and current_category:
    current_category['items'].append(current_item)

# Create V2 menu structure
categories = []
display_order = 1

for cat_data in categories_data:
    if not cat_data['items']:  # Skip empty categories
        continue

    category = {
        'id': str(uuid.uuid4()),
        'name': cat_data['name'],
        'display_order': display_order,
        'items': []
    }

    item_order = 1
    for item_data in cat_data['items']:
        item = {
            'id': str(uuid.uuid4()),
            'name': item_data['name'],
            'description': item_data['description'],
            'price': item_data['price'],
            'price_type': 'FIXED' if item_data['price'] else 'MP',
            'source': 'recovered_from_chat_database',
            'display_order': item_order,
            'allergens': [],
            'dietary_tags': [],
            'prep_methods': [],
            'modifiers': [],
            'modifier_groups': [],
            'removable_ingredients': [],
            'needs_review': False,
            'review_reasons': []
        }
        category['items'].append(item)
        item_order += 1

    categories.append(category)
    display_order += 1

# Create V2 menu
v2_menu = {
    'version': 2,
    'currency': 'USD',
    'language': 'en',
    'updated_at': '',
    'raw_input': menu_text,  # Preserve the original format
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

print('=' * 80)
print('EL MITOTE COMPLETE MENU RECOVERY')
print('=' * 80)
print(f'\nRecovered {len(categories)} categories, {total_items} items:\n')

for cat in categories:
    print(f'{cat["name"]}: {len(cat["items"])} items')
    for item in cat['items']:
        price_str = f'${item["price"]:.0f}' if item['price'] else 'MP'
        print(f'  - {item["name"]} ({price_str})')

# Get El Mitote menu
restaurant = session.query(db_models.Restaurant).get(11)
menu = restaurant.menus[0]

# Update database
menu.menu_data = json.dumps(v2_menu, indent=2)
session.add(menu)
session.commit()

print('\n' + '=' * 80)
print(f'✅ El Mitote complete menu recovered successfully!')
print(f'Total items: {total_items}')
print('=' * 80)

session.close()
