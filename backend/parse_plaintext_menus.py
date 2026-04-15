#!/usr/bin/env python3
"""
Parse Plain Text Menus to V2 JSON Format

This script:
1. Finds all menus with plain text (non-JSON) data
2. Uses OpenAI GPT-4 to parse the plain text into structured V2 JSON
3. Updates the database with parsed V2 JSON

Usage:
    python parse_plaintext_menus.py --dry-run  # Preview without saving
    python parse_plaintext_menus.py            # Actually parse and save
"""

import os
import sys
import json
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import db_models
import menu_schema
import llm

# Initialize database
connection_string = 'sqlite:///localdata.db'
engine = create_engine(connection_string)
db_models.Base.metadata.bind = engine
DBSession = sessionmaker(bind=engine)


def is_plain_text(menu_data_str: str) -> bool:
    """Check if menu_data is plain text (not JSON)"""
    try:
        json.loads(menu_data_str)
        return False  # It's valid JSON
    except (json.JSONDecodeError, TypeError):
        return True  # It's plain text


def parse_plain_text_menu_with_llm(plain_text: str, restaurant_name: str) -> dict:
    """
    Use GPT-4 to parse plain text menu into V2 JSON format.

    Args:
        plain_text: Raw menu text
        restaurant_name: Name of restaurant (for context)

    Returns:
        Parsed menu in V2 JSON format
    """
    system_prompt = """You are a menu parsing expert. Convert plain text menus into structured JSON format.

Output format (V2 schema):
{
  "version": 2,
  "currency": "USD",
  "language": "en",
  "updated_at": "",
  "raw_input": "<original plain text>",
  "menus": [
    {
      "id": "<generate uuid>",
      "name": "<Breakfast|Brunch|Lunch|Dinner|Drinks|All Day|etc>",
      "display_order": 1,
      "categories": [
        {
          "id": "<generate uuid>",
          "name": "<category name from menu>",
          "display_order": 1,
          "items": [
            {
              "id": "<generate uuid>",
              "name": "<item name>",
              "description": "<item description>",
              "price": <numeric price or null>,
              "price_type": "<FIXED or MP>",
              "source": "parsed",
              "display_order": 1,
              "allergens": [],
              "dietary_tags": [],
              "prep_methods": [],
              "modifiers": [],
              "modifier_groups": [],
              "removable_ingredients": [],
              "needs_review": false,
              "review_reasons": []
            }
          ]
        }
      ]
    }
  ],
  "specials": [],
  "upsell_tips": []
}

Rules:
1. If you see a price (like "12" or "$15.99"), use price_type="FIXED" and set price to numeric value
2. If you see "MP", "Market Price", or no price, use price_type="MP" and price=null
3. Detect meal period from text (Breakfast, Lunch, Dinner, etc.) for menu name
4. Organize items into categories based on headings in the text
5. Extract descriptions from the plain text
6. Generate valid UUIDs for all id fields
7. Include the original plain text in raw_input field
8. Output ONLY valid JSON, no extra text
"""

    chat = llm.ChatLLM(system_prompt, model='gpt-4-turbo-preview')

    user_prompt = f"""Restaurant: {restaurant_name}

Plain text menu:
```
{plain_text[:8000]}
```

Convert this menu to V2 JSON format. Output only valid JSON."""

    response = chat.message(msg=user_prompt, response_format={"type": "json_object"})

    # Parse and validate
    parsed = json.loads(response)

    # Ensure it's V2 format
    if not menu_schema.is_v2(parsed):
        # Try to normalize it
        parsed = menu_schema.normalize_v2(parsed)

    return parsed


def migrate_plaintext_menus(dry_run: bool = False):
    """
    Find and parse all plain text menus.

    Args:
        dry_run: If True, preview without saving to database
    """
    session = DBSession()

    try:
        restaurants = session.query(db_models.Restaurant).all()

        stats = {
            'total_restaurants': len(restaurants),
            'total_menus': 0,
            'plain_text_menus': 0,
            'successfully_parsed': 0,
            'errors': 0,
            'already_json': 0
        }

        print("=" * 70)
        print("Plain Text Menu Migration")
        print("=" * 70)
        print(f"Mode: {'DRY RUN (no changes saved)' if dry_run else 'LIVE (will save changes)'}")
        print()

        for restaurant in restaurants:
            print(f"\n🏪 Restaurant: {restaurant.name} (ID: {restaurant.id})")

            for menu in restaurant.menus:
                stats['total_menus'] += 1

                # Check if menu_data is plain text
                if not is_plain_text(menu.menu_data):
                    stats['already_json'] += 1
                    # Check if it's V2
                    try:
                        menu_json = json.loads(menu.menu_data)
                        if menu_schema.is_v2(menu_json):
                            print(f"  ✅ Menu ID {menu.id}: Already V2 JSON format")
                        else:
                            print(f"  ⚠️  Menu ID {menu.id}: JSON but V1 format (needs v1_to_v2 migration)")
                    except:
                        print(f"  ⚠️  Menu ID {menu.id}: JSON but parse error")
                    continue

                # It's plain text - needs parsing
                stats['plain_text_menus'] += 1
                print(f"  📄 Menu ID {menu.id}: Plain text format (length: {len(menu.menu_data)} chars)")
                print(f"     Preview: {menu.menu_data[:100]}...")

                try:
                    if not dry_run:
                        print(f"     🤖 Parsing with GPT-4...")
                        parsed_v2 = parse_plain_text_menu_with_llm(
                            menu.menu_data,
                            restaurant.name
                        )

                        # Validate
                        errors = menu_schema.validate_menu_data_v2(parsed_v2)
                        if errors:
                            print(f"     ❌ Validation errors:")
                            for error in errors[:5]:  # Show first 5 errors
                                print(f"        - {error}")
                            stats['errors'] += 1
                        else:
                            # Save to database
                            menu.menu_data = json.dumps(parsed_v2, indent=2)
                            session.add(menu)
                            session.commit()
                            stats['successfully_parsed'] += 1

                            # Count items
                            item_count = sum(
                                len(cat['items'])
                                for m in parsed_v2['menus']
                                for cat in m['categories']
                            )
                            print(f"     ✅ Parsed successfully: {item_count} items")
                    else:
                        print(f"     ⏭️  Skipping (dry run)")

                except Exception as e:
                    print(f"     ❌ Error parsing: {e}")
                    stats['errors'] += 1

        # Summary
        print()
        print("=" * 70)
        print("Migration Summary")
        print("=" * 70)
        print(f"Total restaurants:        {stats['total_restaurants']}")
        print(f"Total menus:              {stats['total_menus']}")
        print(f"Plain text menus:         {stats['plain_text_menus']}")
        print(f"Successfully parsed:      {stats['successfully_parsed']}")
        print(f"Already JSON:             {stats['already_json']}")
        print(f"Errors:                   {stats['errors']}")
        print("=" * 70)

        if dry_run:
            print()
            print("⚠️  This was a DRY RUN. No changes were saved.")
            print("    Run without --dry-run to actually parse and save menus.")

    finally:
        session.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Parse plain text menus to V2 JSON format using GPT-4'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview without saving changes'
    )
    args = parser.parse_args()

    # Check for OpenAI API key
    if not os.getenv('OPENAI_KEY'):
        openai_key_file = os.path.expanduser('~/.openai_key')
        if not os.path.exists(openai_key_file):
            print("❌ Error: OpenAI API key not found.")
            print("   Set OPENAI_KEY environment variable or create ~/.openai_key file")
            sys.exit(1)

    migrate_plaintext_menus(dry_run=args.dry_run)
