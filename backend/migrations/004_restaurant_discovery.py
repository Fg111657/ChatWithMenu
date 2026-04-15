#!/usr/bin/env python3
"""
Migration 004: Restaurant Discovery - Add Missing Columns
Adds remaining columns for restaurant search/filter functionality:
- phone: Contact phone number
- dietary_tags: Dietary-friendly tags (JSON array)

Note: cuisine_type, hours_json, rating_aggregate, etc. already exist in DB
"""

from sqlalchemy import create_engine, text
import os
import sys

# Add parent directory to path to import db_models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    # Try PostgreSQL first (production)
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url

    # Fall back to SQLite (development)
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'

def run_migration():
    """Apply the migration"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Running migration 004 on database: {database_url}")

    with engine.connect() as conn:
        # Check if columns already exist (idempotent migration)
        if 'postgresql' in database_url:
            # PostgreSQL syntax
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='restaurants' AND column_name='phone'
            """))
            if result.fetchone():
                print("✓ Columns already exist. Skipping migration.")
                return

            # Add columns
            print("Adding phone column...")
            conn.execute(text("ALTER TABLE restaurants ADD COLUMN phone VARCHAR(20)"))

            print("Adding dietary_tags column...")
            conn.execute(text("ALTER TABLE restaurants ADD COLUMN dietary_tags TEXT"))

            conn.commit()

        else:
            # SQLite syntax (for development)
            # Check if column exists
            result = conn.execute(text("PRAGMA table_info(restaurants)"))
            columns = [row[1] for row in result.fetchall()]

            if 'phone' in columns:
                print("✓ Columns already exist. Skipping migration.")
                return

            # Add columns
            print("Adding phone column...")
            conn.execute(text("ALTER TABLE restaurants ADD COLUMN phone VARCHAR(20)"))

            print("Adding dietary_tags column...")
            conn.execute(text("ALTER TABLE restaurants ADD COLUMN dietary_tags TEXT"))

            conn.commit()

    print("✓ Migration 004 completed successfully!")

def rollback_migration():
    """Rollback the migration (for development only)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Rolling back migration 004 on database: {database_url}")

    with engine.connect() as conn:
        if 'postgresql' in database_url:
            conn.execute(text("ALTER TABLE restaurants DROP COLUMN IF EXISTS phone"))
            conn.execute(text("ALTER TABLE restaurants DROP COLUMN IF EXISTS dietary_tags"))
            conn.commit()
        else:
            # SQLite doesn't support DROP COLUMN easily, would need to recreate table
            print("WARNING: SQLite doesn't support DROP COLUMN. Manual rollback required.")

    print("✓ Migration 004 rolled back!")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback_migration()
    else:
        run_migration()
