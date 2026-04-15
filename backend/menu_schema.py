"""
Menu Schema V2 Helpers

Provides utilities for:
- Detecting V1 vs V2 format
- Converting V1 (sections[]) → V2 (menus[].categories[])
- Normalizing V2 data with defaults
- Validating price_type and price fields
- Standardizing capitalization for consistency
"""
import json
import uuid
import re
from typing import Dict, List, Any, Optional


def generate_id() -> str:
    """Generate a unique ID for menu entities"""
    return str(uuid.uuid4())


def is_v2(menu_data: Dict[str, Any]) -> bool:
    """
    Check if menu_data is in V2 format.

    V2 format has:
    - version: 2
    - menus: [...]
    - No "sections" key at root

    Returns:
        bool: True if V2, False otherwise
    """
    if not isinstance(menu_data, dict):
        return False

    # V2 must have version=2 and menus array
    has_version_2 = menu_data.get('version') == 2
    has_menus = 'menus' in menu_data and isinstance(menu_data.get('menus'), list)
    has_no_sections = 'sections' not in menu_data

    return has_version_2 and has_menus and has_no_sections


def detect_meal_period(raw_input: str) -> str:
    """Detect meal period from raw menu text"""
    if not raw_input:
        return 'Dinner'

    raw_lower = raw_input.lower()
    if 'breakfast' in raw_lower:
        return 'Breakfast'
    elif 'brunch' in raw_lower:
        return 'Brunch'
    elif 'lunch' in raw_lower:
        return 'Lunch'
    elif 'dinner' in raw_lower:
        return 'Dinner'
    else:
        return 'Dinner'  # Default


# Capitalization Standardization
LOWERCASE_WORDS_EN = {'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'of', 'in'}
LOWERCASE_WORDS_FOREIGN = {'di', 'del', 'della', 'con', 'e', 'al', 'alla', 'il', 'la', 'le', 'los', 'las', 'el', 'de', 'y', 'à', 'au', 'aux', 'du', 'des'}
ACRONYMS = {'BLT', 'BEC', 'PB', 'PBJ', 'BBQ', 'NYC', 'NYC', 'DJ', 'TV', 'USA'}


def detect_language(text: str) -> str:
    """Detect if text is likely English or foreign language"""
    if not text:
        return 'en'

    foreign_indicators = 0
    if re.search(r'\b(di|del|della|con|al|alla|il|la|le)\b', text.lower()):
        foreign_indicators += 1
    if re.search(r'[àèéìòù]', text.lower()):
        foreign_indicators += 1

    return 'other' if foreign_indicators > 0 else 'en'


def standardize_capitalization(name: str, language: str = None) -> str:
    """
    Standardize capitalization based on language.

    Rules:
    - English: Title Case (capitalize major words)
    - Foreign: Sentence case (capitalize first letter only)
    - Preserves acronyms
    - Fixes mixed case errors
    """
    if not name or not name.strip():
        return name

    if language is None:
        language = detect_language(name)

    # Check if it's an acronym
    name_upper = name.strip().upper()
    if name_upper in ACRONYMS:
        return name_upper

    # Fix obvious mixed case errors
    if re.search(r'[a-z][A-Z]', name) and not re.match(r'^[A-Z][a-z]+[A-Z]', name):
        name = name.lower()

    words = name.split()

    if language == 'en':
        # English: Title Case
        standardized_words = []
        for i, word in enumerate(words):
            if i == 0 or i == len(words) - 1:
                standardized_words.append(word.capitalize())
            elif word.lower() in LOWERCASE_WORDS_EN:
                standardized_words.append(word.lower())
            elif '&' in word or '-' in word:
                parts = re.split(r'([&-])', word)
                standardized_words.append(''.join(p.capitalize() if p.isalpha() else p for p in parts))
            else:
                standardized_words.append(word.capitalize())
        return ' '.join(standardized_words)
    else:
        # Foreign language: Sentence case
        standardized_words = []
        for i, word in enumerate(words):
            if i == 0:
                standardized_words.append(word.capitalize())
            elif word.lower() in LOWERCASE_WORDS_FOREIGN:
                standardized_words.append(word.lower())
            elif word.isupper() and len(word) > 1:
                standardized_words.append(word.capitalize())
            else:
                standardized_words.append(word)
        return ' '.join(standardized_words)


def normalize_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize a single menu item with all required V2 fields.

    Ensures:
    - id exists
    - name capitalization is standardized
    - price_type defaults to "FIXED"
    - price is numeric or null
    - source defaults to "parsed"
    - available defaults to True (restaurant owner can toggle to False)
    - Optional arrays exist (prep_methods, modifier_groups, removable_ingredients)
    """
    # Standardize item name capitalization
    item_name = item.get('name', 'Unnamed Item')
    if item_name and item_name != 'Unnamed Item':
        item_name = standardize_capitalization(item_name)

    normalized = {
        'id': item.get('id', generate_id()),
        'name': item_name,
        'description': item.get('description', ''),
        'price': item.get('price'),
        'price_type': item.get('price_type', 'FIXED'),
        'source': item.get('source', 'parsed'),
        'display_order': item.get('display_order', 1),
        'allergens': item.get('allergens', []),
        'dietary_tags': item.get('dietary_tags', []),
        'prep_methods': item.get('prep_methods', []),
        'modifiers': item.get('modifiers', []),
        'modifier_groups': item.get('modifier_groups', []),
        'removable_ingredients': item.get('removable_ingredients', []),
        'needs_review': item.get('needs_review', False),
        'review_reasons': item.get('review_reasons', []),
        'available': item.get('available', True),  # Default to available unless toggled by restaurant owner
    }

    # Ensure price_type consistency
    if normalized['price_type'] == 'MP':
        normalized['price'] = None
    elif normalized['price_type'] == 'FIXED' and normalized['price'] is not None:
        # Ensure price is numeric
        try:
            normalized['price'] = float(normalized['price'])
        except (ValueError, TypeError):
            normalized['price'] = 0.0

    return normalized


def v1_to_v2(menu_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert V1 format (sections[]) to V2 format (menus[].categories[]).

    V1 format:
    {
      "sections": [{"name": "...", "items": [...]}],
      "raw_input": "...",
      ...
    }

    V2 format:
    {
      "version": 2,
      "menus": [
        {
          "id": "uuid",
          "name": "Dinner",
          "display_order": 1,
          "categories": [{"id": "uuid", "name": "...", "items": [...]}]
        }
      ],
      ...
    }

    Args:
        menu_data: Dictionary in V1 format

    Returns:
        Dictionary in V2 format
    """
    if is_v2(menu_data):
        return menu_data

    # Extract sections (V1)
    sections = menu_data.get('sections', [])
    raw_input = menu_data.get('raw_input', '')

    # Detect meal period name
    menu_name = detect_meal_period(raw_input)

    # Convert sections to categories
    categories = []
    for idx, section in enumerate(sections):
        # Standardize category name capitalization
        cat_name = section.get('name', f'Category {idx + 1}')
        if cat_name and not cat_name.startswith('Category '):
            cat_name = standardize_capitalization(cat_name)

        category = {
            'id': section.get('id', generate_id()),
            'name': cat_name,
            'display_order': section.get('display_order', idx + 1),
            'items': [normalize_item(item) for item in section.get('items', [])]
        }
        categories.append(category)

    # Build V2 structure
    v2_data = {
        'version': 2,
        'currency': menu_data.get('currency', 'USD'),
        'language': menu_data.get('language', 'en'),
        'updated_at': menu_data.get('updated_at', ''),
        'raw_input': raw_input,
        'menus': [
            {
                'id': generate_id(),
                'name': menu_name,
                'display_order': 1,
                'categories': categories
            }
        ],
        'specials': menu_data.get('specials', []),
        'upsell_tips': menu_data.get('upsell_tips', []),
    }

    return v2_data


def normalize_v2(menu_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize V2 menu_data to ensure all optional fields exist with defaults.

    Args:
        menu_data: Dictionary in V2 format

    Returns:
        Normalized V2 dictionary
    """
    if not is_v2(menu_data):
        # Convert if needed
        menu_data = v1_to_v2(menu_data)

    normalized = {
        'version': 2,
        'currency': menu_data.get('currency', 'USD'),
        'language': menu_data.get('language', 'en'),
        'updated_at': menu_data.get('updated_at', ''),
        'raw_input': menu_data.get('raw_input', ''),
        'menus': [],
        'specials': menu_data.get('specials', []),
        'upsell_tips': menu_data.get('upsell_tips', []),
    }

    # Normalize menus
    for menu in menu_data.get('menus', []):
        normalized_menu = {
            'id': menu.get('id', generate_id()),
            'name': menu.get('name', 'Dinner'),
            'display_order': menu.get('display_order', 1),
            'categories': []
        }

        # Normalize categories
        for category in menu.get('categories', []):
            # Standardize category name capitalization
            cat_name = category.get('name', 'Unnamed Category')
            if cat_name and cat_name != 'Unnamed Category':
                cat_name = standardize_capitalization(cat_name)

            normalized_category = {
                'id': category.get('id', generate_id()),
                'name': cat_name,
                'display_order': category.get('display_order', 1),
                'items': [normalize_item(item) for item in category.get('items', [])]
            }
            normalized_menu['categories'].append(normalized_category)

        normalized['menus'].append(normalized_menu)

    return normalized


def validate_menu_data_v2(menu_data: Dict[str, Any]) -> List[str]:
    """
    Validate V2 menu_data structure and business rules.

    Validation rules:
    - Must have version=2
    - Must have menus array
    - No "sections" key allowed
    - Each item must have price_type in ["FIXED", "MP"]
    - If price_type=MP, price must be null
    - If price_type=FIXED, price must be a number >= 0
    - Item names must not be empty

    Args:
        menu_data: Dictionary to validate

    Returns:
        List of error messages (empty list if valid)
    """
    errors = []

    # Check basic structure
    if not isinstance(menu_data, dict):
        errors.append("menu_data must be a dictionary")
        return errors

    if menu_data.get('version') != 2:
        errors.append("menu_data.version must be 2")

    if 'menus' not in menu_data:
        errors.append("menu_data must have 'menus' key")
        return errors

    if not isinstance(menu_data['menus'], list):
        errors.append("menu_data.menus must be a list")
        return errors

    if 'sections' in menu_data:
        errors.append("menu_data must not contain 'sections' key (V1 format not allowed)")

    # Validate each menu
    for menu_idx, menu in enumerate(menu_data['menus']):
        if not isinstance(menu, dict):
            errors.append(f"menus[{menu_idx}] must be a dictionary")
            continue

        if 'categories' not in menu:
            errors.append(f"menus[{menu_idx}] must have 'categories' key")
            continue

        # Validate each category
        for cat_idx, category in enumerate(menu.get('categories', [])):
            if not isinstance(category, dict):
                errors.append(f"menus[{menu_idx}].categories[{cat_idx}] must be a dictionary")
                continue

            # Validate each item
            for item_idx, item in enumerate(category.get('items', [])):
                if not isinstance(item, dict):
                    errors.append(f"Item at menus[{menu_idx}].categories[{cat_idx}].items[{item_idx}] must be a dictionary")
                    continue

                item_name = item.get('name', '')
                item_path = f"menus[{menu_idx}].categories[{cat_idx}].items[{item_idx}] ('{item_name}')"

                # Validate name
                if not item_name or not item_name.strip():
                    errors.append(f"{item_path}: Item name is required")

                # Validate price_type
                price_type = item.get('price_type', 'FIXED')
                if price_type not in ['FIXED', 'MP']:
                    errors.append(f"{item_path}: price_type must be 'FIXED' or 'MP', got '{price_type}'")

                # Validate price consistency
                price = item.get('price')
                if price_type == 'MP':
                    if price is not None:
                        errors.append(f"{item_path}: price_type='MP' requires price=null, got {price}")
                elif price_type == 'FIXED':
                    if price is None:
                        errors.append(f"{item_path}: price_type='FIXED' requires a numeric price, got null")
                    else:
                        try:
                            price_float = float(price)
                            if price_float < 0:
                                errors.append(f"{item_path}: price cannot be negative, got {price_float}")
                        except (ValueError, TypeError):
                            errors.append(f"{item_path}: price must be numeric, got {price}")

    return errors


# Convenience function for API endpoints
def prepare_menu_data_for_response(menu_data_str: str) -> Dict[str, Any]:
    """
    Parse menu_data from DB (string), convert to V2, normalize, and return as dict.

    This is the main function API endpoints should use to serve V2.

    Args:
        menu_data_str: JSON string from database

    Returns:
        Normalized V2 dictionary ready for JSON response
    """
    try:
        menu_data = json.loads(menu_data_str)
    except (json.JSONDecodeError, TypeError):
        # Return empty V2 structure if parsing fails
        return {
            'version': 2,
            'currency': 'USD',
            'language': 'en',
            'updated_at': '',
            'raw_input': '',
            'menus': [],
            'specials': [],
            'upsell_tips': []
        }

    # Convert V1 → V2 if needed, then normalize
    if not is_v2(menu_data):
        menu_data = v1_to_v2(menu_data)

    return normalize_v2(menu_data)
