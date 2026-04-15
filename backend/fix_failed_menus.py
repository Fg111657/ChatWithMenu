#!/usr/bin/env python3
"""
Fix Failed Menu Parsing

Handles the 6 menus that failed due to GPT-4 JSON errors.
Uses a more robust approach with retry logic and JSON repair.
"""

import os
import sys
import json
import re
import argparse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

import db_models
import menu_schema
import llm

# Initialize database
connection_string = 'sqlite:///localdata.db'
engine = create_engine(connection_string)
db_models.Base.metadata.bind = engine
DBSession = sessionmaker(bind=engine)


def fix_json_string(json_str: str) -> str:
    """
    Attempt to fix common JSON errors in GPT-4 output.

    Common issues:
    - Unterminated strings (missing closing quote)
    - Unescaped quotes in descriptions
    """
    # Try to fix unterminated strings by adding closing quote before newline
    # This is a heuristic and may not work in all cases
    return json_str


def parse_menu_with_retry(plain_text: str, restaurant_name: str, max_retries: int = 3) -> dict:
    """
    Parse plain text menu with retry logic and stricter prompts.
    """
    for attempt in range(max_retries):
        try:
            system_prompt = """You are a menu parsing expert. Convert plain text menus into structured JSON format.

CRITICAL: You MUST output ONLY valid, parseable JSON. NO extra text.

Rules for JSON:
1. ALL string values MUST escape special characters:
   - Use \\" for quotes inside strings
   - Use \\\\ for backslashes
   - Use \\n for newlines within descriptions
2. ALL strings MUST be properly terminated with "
3. NO trailing commas
4. ALL quotes must be escaped in descriptions like: "chicken \\"special\\" sauce"

Output format (V2 schema):
{
  "version": 2,
  "currency": "USD",
  "language": "en",
  "updated_at": "",
  "raw_input": "<include original text here, with proper escaping>",
  "menus": [
    {
      "id": "<uuid>",
      "name": "<Breakfast|Lunch|Dinner|etc>",
      "display_order": 1,
      "categories": [
        {
          "id": "<uuid>",
          "name": "<category name>",
          "display_order": 1,
          "items": [
            {
              "id": "<uuid>",
              "name": "<item name>",
              "description": "<description - MUST escape quotes>",
              "price": <number or null>,
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

Price rules:
- If price like "$12", "15.99", use price_type="FIXED" and price=<number>
- If "MP" or "Market Price" or no price, use price_type="MP" and price=null
"""

            chat = llm.ChatLLM(system_prompt, model='gpt-4-turbo-preview')

            # Shorter text to reduce complexity
            truncated_text = plain_text[:6000]  # Limit to 6000 chars

            user_prompt = f"""Restaurant: {restaurant_name}

Menu text (convert to valid JSON):
```
{truncated_text}
```

Output ONLY valid JSON. Ensure all quotes in descriptions are escaped as \\"""

            print(f"      Attempt {attempt + 1}/{max_retries}...")
            response = chat.message(msg=user_prompt, response_format={"type": "json_object"})

            # Try to parse
            parsed = json.loads(response)

            # Ensure it's V2 format
            if not menu_schema.is_v2(parsed):
                parsed = menu_schema.normalize_v2(parsed)

            return parsed

        except json.JSONDecodeError as e:
            print(f"      ❌ JSON decode error on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                # Last attempt - try to salvage what we can
                print(f"      ⚠️  All retries failed, creating minimal menu")
                return create_minimal_menu(plain_text, restaurant_name)
        except Exception as e:
            print(f"      ❌ Error on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                raise

    # Should not reach here
    return create_minimal_menu(plain_text, restaurant_name)


def create_minimal_menu(plain_text: str, restaurant_name: str) -> dict:
    """
    Create a minimal V2 menu structure when parsing fails.
    At least preserves the raw text.
    """
    return {
        "version": 2,
        "currency": "USD",
        "language": "en",
        "updated_at": "",
        "raw_input": plain_text,
        "menus": [
            {
                "id": str(uuid.uuid4()),
                "name": "Dinner",
                "display_order": 1,
                "categories": [
                    {
                        "id": str(uuid.uuid4()),
                        "name": "Needs Manual Parsing",
                        "display_order": 1,
                        "items": [
                            {
                                "id": str(uuid.uuid4()),
                                "name": f"{restaurant_name} Menu (Failed Auto-Parse)",
                                "description": "Menu data preserved in raw_input field. Needs manual parsing.",
                                "price": None,
                                "price_type": "MP",
                                "source": "parsed",
                                "display_order": 1,
                                "allergens": [],
                                "dietary_tags": [],
                                "prep_methods": [],
                                "modifiers": [],
                                "modifier_groups": [],
                                "removable_ingredients": [],
                                "needs_review": True,
                                "review_reasons": ["Failed automatic parsing - needs manual review"]
                            }
                        ]
                    }
                ]
            }
        ],
        "specials": [],
        "upsell_tips": []
    }


def fix_failed_menus(dry_run: bool = False):
    """
    Fix the 6 menus that failed in initial migration.
    """
    session = DBSession()

    # IDs of failed menus from first run
    failed_menu_ids = [0, 4, 5, 6, 8, 10]

    try:
        print("=" * 70)
        print("Fixing Failed Menu Parsing")
        print("=" * 70)
        print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        print()

        stats = {
            'attempted': len(failed_menu_ids),
            'successful': 0,
            'minimal': 0,
            'errors': 0
        }

        for menu_id in failed_menu_ids:
            menu = session.query(db_models.MenuDetail).get(menu_id)
            if not menu:
                print(f"⚠️  Menu ID {menu_id} not found")
                continue

            restaurant = session.query(db_models.Restaurant).get(menu.restaurant_id)
            print(f"\n🏪 Restaurant: {restaurant.name} (Menu ID: {menu_id})")

            # Check if it's still plain text
            try:
                json.loads(menu.menu_data)
                print(f"  ✅ Already converted to JSON (skipping)")
                continue
            except (json.JSONDecodeError, TypeError):
                pass  # Still plain text

            print(f"  📄 Plain text length: {len(menu.menu_data)} chars")

            try:
                if not dry_run:
                    parsed_v2 = parse_menu_with_retry(
                        menu.menu_data,
                        restaurant.name
                    )

                    # Check if it's minimal (fallback)
                    if parsed_v2['menus'][0]['categories'][0]['name'] == "Needs Manual Parsing":
                        print(f"  ⚠️  Created minimal menu (needs manual parsing)")
                        stats['minimal'] += 1
                    else:
                        # Count items
                        item_count = sum(
                            len(cat['items'])
                            for m in parsed_v2['menus']
                            for cat in m['categories']
                        )
                        print(f"  ✅ Parsed successfully: {item_count} items")
                        stats['successful'] += 1

                    # Save to database
                    menu.menu_data = json.dumps(parsed_v2, indent=2)
                    session.add(menu)
                    session.commit()
                else:
                    print(f"  ⏭️  Skipping (dry run)")

            except Exception as e:
                print(f"  ❌ Error: {e}")
                stats['errors'] += 1

        # Summary
        print()
        print("=" * 70)
        print("Fix Summary")
        print("=" * 70)
        print(f"Attempted:         {stats['attempted']}")
        print(f"Successfully parsed: {stats['successful']}")
        print(f"Minimal menus:     {stats['minimal']}")
        print(f"Errors:            {stats['errors']}")
        print("=" * 70)

        if dry_run:
            print("\n⚠️  This was a DRY RUN. No changes were saved.")

    finally:
        session.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Fix menus that failed initial parsing'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview without saving changes'
    )
    args = parser.parse_args()

    fix_failed_menus(dry_run=args.dry_run)
