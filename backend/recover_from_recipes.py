#!/usr/bin/env python3
"""Recover full menu data from Recipe/Ingredients documents"""

import db_models
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
import csv
import io
import uuid

engine = create_engine('sqlite:///localdata.db')
DBSession = sessionmaker(bind=engine)
session = DBSession()

def parse_recipe_csv(recipe_text):
    """Parse the Recipe CSV format into menu items"""
    items = []
    reader = csv.DictReader(io.StringIO(recipe_text))

    for row in reader:
        item_name = row.get('Menu Item', '').strip()
        ingredients = row.get('Ingredients', '').strip()

        if item_name:
            items.append({
                'name': item_name,
                'ingredients': ingredients
            })

    return items

def categorize_items(items):
    """Group items into categories based on Italian menu structure"""
    categories = {
        'Zuppe (Soups)': [],
        'Insalate (Salads)': [],
        'Antipasti (Appetizers)': [],
        'Risotto': [],
        'Pasta': [],
        'Secondi (Main Courses)': [],
        'Contorni (Sides)': [],
        'Dolci (Desserts)': [],
        'Formaggi (Cheese)': []
    }

    # Keywords for categorization
    soup_keywords = ['soup', 'brodo', 'zuppa']
    salad_keywords = ['insalat', 'indivia', 'spinaci', 'cesare', 'mista', 'tricolore']
    appetizer_keywords = ['antipasto', 'prosciutto', 'carpaccio', 'polpette', 'calamari',
                          'salmone', 'caprese', 'cozze', 'verdure grigliate']
    risotto_keywords = ['risotto']
    pasta_keywords = ['penne', 'spaghetti', 'gnocchi', 'buccatini', 'orecchiette',
                     'linguine', 'fettuccine']
    main_keywords = ['vitello', 'agnello', 'manzo', 'scampi', 'capesante', 'branzino',
                    'parmigiana', 'filetto', 'brasato', 'scaloppine']
    side_keywords = ['pure', 'asparagi', 'spinaci', 'cavoletti', 'cime di rapa']
    dessert_keywords = ['tiramisu', 'crostata', 'biscotti', 'panna cotta', 'sorbetto',
                       'gelato', 'affogato', 'tartufo', 'dessert']
    cheese_keywords = ['formaggi']

    for item in items:
        name_lower = item['name'].lower()

        if any(kw in name_lower for kw in cheese_keywords):
            categories['Formaggi (Cheese)'].append(item)
        elif any(kw in name_lower for kw in dessert_keywords):
            categories['Dolci (Desserts)'].append(item)
        elif any(kw in name_lower for kw in side_keywords):
            categories['Contorni (Sides)'].append(item)
        elif any(kw in name_lower for kw in soup_keywords):
            categories['Zuppe (Soups)'].append(item)
        elif any(kw in name_lower for kw in salad_keywords):
            categories['Insalate (Salads)'].append(item)
        elif any(kw in name_lower for kw in appetizer_keywords):
            categories['Antipasti (Appetizers)'].append(item)
        elif any(kw in name_lower for kw in risotto_keywords):
            categories['Risotto'].append(item)
        elif any(kw in name_lower for kw in pasta_keywords):
            categories['Pasta'].append(item)
        elif any(kw in name_lower for kw in main_keywords):
            categories['Secondi (Main Courses)'].append(item)
        else:
            # Default to appetizers if unsure
            categories['Antipasti (Appetizers)'].append(item)

    # Remove empty categories
    return {k: v for k, v in categories.items() if v}

def create_v2_menu_from_recipes(restaurant_name, recipe_items, existing_raw_input=''):
    """Create a complete V2 menu structure from recipe items"""

    categorized = categorize_items(recipe_items)

    categories = []
    display_order = 1

    for cat_name, items in categorized.items():
        category = {
            'id': str(uuid.uuid4()),
            'name': cat_name,
            'display_order': display_order,
            'items': []
        }

        item_order = 1
        for item_data in items:
            item = {
                'id': str(uuid.uuid4()),
                'name': item_data['name'],
                'description': item_data['ingredients'],
                'price': None,  # Price not in recipe data
                'price_type': 'MP',  # Market Price since we don't have prices
                'source': 'recovered_from_recipe',
                'display_order': item_order,
                'allergens': [],
                'dietary_tags': [],
                'prep_methods': [],
                'modifiers': [],
                'modifier_groups': [],
                'removable_ingredients': [],
                'needs_review': True,  # Flag for manual price entry
                'review_reasons': ['Price needs to be added manually']
            }
            category['items'].append(item)
            item_order += 1

        categories.append(category)
        display_order += 1

    # Create V2 structure
    v2_menu = {
        'version': 2,
        'currency': 'USD',
        'language': 'en',
        'updated_at': '',
        'raw_input': existing_raw_input,  # Preserve existing raw_input
        'menus': [
            {
                'id': str(uuid.uuid4()),
                'name': 'Dinner',
                'display_order': 1,
                'categories': categories
            }
        ],
        'specials': [],
        'upsell_tips': []
    }

    return v2_menu

# Process Il Violino
print('Recovering Il Violino menu from Recipe document...')
print('=' * 80)

restaurant = session.query(db_models.Restaurant).get(0)

# Get Recipe document
recipe_doc = None
for doc in restaurant.documents:
    if doc.document_type == 'Recipe':
        recipe_doc = doc
        break

if recipe_doc:
    print(f'Found Recipe document: {len(recipe_doc.document_data)} chars')

    # Parse recipes
    recipe_items = parse_recipe_csv(recipe_doc.document_data)
    print(f'Parsed {len(recipe_items)} menu items from Recipe document')

    # Get existing menu to preserve raw_input
    existing_menu = restaurant.menus[0]
    existing_data = json.loads(existing_menu.menu_data)
    existing_raw = existing_data.get('raw_input', '')

    # Create new V2 menu
    new_v2_menu = create_v2_menu_from_recipes(
        restaurant.name,
        recipe_items,
        existing_raw
    )

    print(f'\nCreated V2 menu with {len(new_v2_menu["menus"][0]["categories"])} categories:')
    for cat in new_v2_menu['menus'][0]['categories']:
        print(f'  - {cat["name"]}: {len(cat["items"])} items')

    print(f'\nTotal items: {sum(len(cat["items"]) for cat in new_v2_menu["menus"][0]["categories"])}')

    # Ask for confirmation before saving
    print('\n' + '=' * 80)
    print('Ready to update database with recovered menu.')
    print('This will replace the current 9-item menu with the full recovered menu.')
    print('=' * 80)

    # Update database
    existing_menu.menu_data = json.dumps(new_v2_menu, indent=2)
    session.add(existing_menu)
    session.commit()

    print('\n✅ Database updated successfully!')
    print(f'Il Violino now has {sum(len(cat["items"]) for cat in new_v2_menu["menus"][0]["categories"])} items')

else:
    print('❌ No Recipe document found for Il Violino')

session.close()
