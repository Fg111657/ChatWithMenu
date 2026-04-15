#!/usr/bin/env python3
"""
Migration script: Convert all restaurant menu_data from V1 to V2 format.

Usage:
    python migrate_menu_v1_to_v2.py [--dry-run]

Options:
    --dry-run    Show what would be migrated without making changes
"""
import argparse
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import db_models
import menu_schema

def migrate_all_restaurants(connection_string: str, dry_run: bool = False):
    """
    Migrate all restaurants from V1 to V2 format.

    Args:
        connection_string: Database connection string
        dry_run: If True, only report what would be changed
    """
    engine = create_engine(connection_string)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("=" * 70)
    print("Menu Data Migration: V1 → V2")
    print("=" * 70)
    print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (will update database)'}")
    print()

    try:
        # Get all restaurants
        restaurants = session.query(db_models.Restaurant).all()
        print(f"Found {len(restaurants)} restaurants")
        print()

        migrated_count = 0
        already_v2_count = 0
        empty_count = 0
        error_count = 0

        for restaurant in restaurants:
            print(f"Restaurant #{restaurant.id}: {restaurant.name}")

            if not restaurant.menus:
                print("  ⚠️  No menus found, skipping")
                empty_count += 1
                print()
                continue

            for menu_idx, menu in enumerate(restaurant.menus):
                print(f"  Menu #{menu.id} (index {menu_idx}):")

                try:
                    # Parse current menu_data
                    if not menu.menu_data or menu.menu_data.strip() == '':
                        print("    ⚠️  Empty menu_data, skipping")
                        empty_count += 1
                        continue

                    try:
                        menu_data = json.loads(menu.menu_data)
                    except json.JSONDecodeError as e:
                        print(f"    ❌ JSON parse error: {e}")
                        error_count += 1
                        continue

                    # Check if already V2
                    if menu_schema.is_v2(menu_data):
                        print("    ✅ Already V2 format")
                        already_v2_count += 1
                        continue

                    # Convert V1 → V2
                    print("    🔄 Converting V1 → V2...")
                    v2_data = menu_schema.v1_to_v2(menu_data)

                    # Validate
                    validation_errors = menu_schema.validate_menu_data_v2(v2_data)
                    if validation_errors:
                        print(f"    ❌ Validation errors after conversion:")
                        for error in validation_errors[:3]:  # Show first 3 errors
                            print(f"       - {error}")
                        if len(validation_errors) > 3:
                            print(f"       ... and {len(validation_errors) - 3} more errors")
                        error_count += 1
                        continue

                    # Show summary
                    menus_count = len(v2_data.get('menus', []))
                    categories_count = sum(len(m.get('categories', [])) for m in v2_data.get('menus', []))
                    items_count = sum(
                        len(cat.get('items', []))
                        for menu in v2_data.get('menus', [])
                        for cat in menu.get('categories', [])
                    )

                    print(f"    ✅ Converted: {menus_count} menus, {categories_count} categories, {items_count} items")

                    # Save to DB (unless dry run)
                    if not dry_run:
                        menu.menu_data = json.dumps(v2_data)
                        migrated_count += 1
                        print("    💾 Saved to database")
                    else:
                        migrated_count += 1
                        print("    🔍 Would save to database (dry run)")

                except Exception as e:
                    print(f"    ❌ Unexpected error: {e}")
                    error_count += 1
                    continue

            print()

        # Commit changes (if not dry run)
        if not dry_run and migrated_count > 0:
            session.commit()
            print("✅ Changes committed to database")
        elif dry_run:
            session.rollback()
            print("🔍 Dry run complete - no changes made")
        else:
            print("ℹ️  No changes to commit")

        # Summary
        print()
        print("=" * 70)
        print("Migration Summary")
        print("=" * 70)
        print(f"Total restaurants:     {len(restaurants)}")
        print(f"Migrated (V1 → V2):    {migrated_count}")
        print(f"Already V2:            {already_v2_count}")
        print(f"Empty/skipped:         {empty_count}")
        print(f"Errors:                {error_count}")
        print("=" * 70)

        if dry_run and migrated_count > 0:
            print()
            print("ℹ️  This was a dry run. To actually migrate, run without --dry-run:")
            print("   python migrate_menu_v1_to_v2.py")

    except Exception as e:
        print(f"❌ Fatal error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Migrate restaurant menu_data from V1 to V2 format'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be migrated without making changes'
    )
    parser.add_argument(
        '--db',
        default='sqlite:///localdata.db',
        help='Database connection string (default: sqlite:///localdata.db)'
    )

    args = parser.parse_args()

    migrate_all_restaurants(args.db, dry_run=args.dry_run)
