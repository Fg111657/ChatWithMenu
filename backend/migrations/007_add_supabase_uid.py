#!/usr/bin/env python3
"""
Migration 007: Add supabase_uid to User table

CRITICAL SECURITY FIX:
- Maps Supabase UUID (immutable) instead of email (mutable)
- Prevents identity breakage when users change email
- Prevents duplicate email mapping bugs

Changes:
1. Add supabase_uid TEXT column to users table
2. Add UNIQUE index on supabase_uid (partial index for nullable column)
3. Backfill existing users (email-based lookup will set this on first login)

Run:
    python migrations/007_add_supabase_uid.py
"""

from sqlalchemy import create_engine, text
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_database_url():
    """Get database URL from environment or use default SQLite"""
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'


def migrate():
    """
    Add supabase_uid column to users table for stable identity mapping.
    """
    print("=" * 80)
    print("MIGRATION 007: Add supabase_uid to User table")
    print("=" * 80)

    database_url = get_database_url()
    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Step 1: Add supabase_uid column (nullable initially for backfill)
        print("\n📝 Step 1: Adding supabase_uid column to users table...")
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN supabase_uid TEXT
            """))
            conn.commit()
            print("✅ Column added")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("⚠️  Column already exists, skipping")
            else:
                raise

        # Step 2: Add unique constraint on supabase_uid
        # SQLite doesn't support ALTER TABLE ADD CONSTRAINT
        # Use partial unique index (allows NULLs but enforces uniqueness when present)
        print("\n📝 Step 2: Adding unique index on supabase_uid...")
        try:
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid
                ON users(supabase_uid)
                WHERE supabase_uid IS NOT NULL
            """))
            conn.commit()
            print("✅ Unique index created (partial index allows NULLs)")
        except Exception as e:
            print(f"⚠️  Index might already exist: {e}")

        # Step 3: Verify migration
        print("\n📝 Step 3: Verifying migration...")
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = result.fetchall()

        has_supabase_uid = False
        for col in columns:
            if col[1] == 'supabase_uid':  # col[1] is column name
                has_supabase_uid = True
                print(f"✅ Column verified: {col[1]} {col[2]}")
                break

        if not has_supabase_uid:
            print("❌ Migration failed: supabase_uid column not found!")
            sys.exit(1)

        # Check user count
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.fetchone()[0]

        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE supabase_uid IS NOT NULL"))
        backfilled_count = result.fetchone()[0]

        print(f"\n📊 User statistics:")
        print(f"   Total users: {user_count}")
        print(f"   Users with supabase_uid: {backfilled_count}")
        print(f"   Users pending backfill: {user_count - backfilled_count}")

    print("\n" + "=" * 80)
    print("✅ MIGRATION 007 COMPLETE")
    print("=" * 80)
    print("\n📝 Next steps:")
    print("   1. Update db_models.py to add supabase_uid column definition")
    print("   2. Deploy updated user_helpers.py (UUID-based mapping)")
    print("   3. Existing users will be backfilled on first login (email fallback)")
    print("   4. New users will have supabase_uid set on account creation")
    print("")


def rollback():
    """
    Rollback migration (remove supabase_uid column).

    WARNING: This will lose all supabase_uid mappings!
    """
    print("=" * 80)
    print("ROLLBACK MIGRATION 007: Remove supabase_uid from User table")
    print("=" * 80)

    database_url = get_database_url()
    engine = create_engine(database_url)

    with engine.connect() as conn:
        # Step 1: Drop index
        print("\n📝 Step 1: Dropping unique index...")
        try:
            conn.execute(text("DROP INDEX IF EXISTS idx_users_supabase_uid"))
            conn.commit()
            print("✅ Index dropped")
        except Exception as e:
            print(f"⚠️  Error dropping index: {e}")

        # Step 2: Remove column (SQLite limitation - must recreate table)
        print("\n📝 Step 2: Removing supabase_uid column...")
        print("⚠️  SQLite limitation: Column removal requires table recreation")
        print("⚠️  This is destructive - backup your database first!")
        print("")
        print("❌ Manual rollback required:")
        print("   1. Backup database")
        print("   2. Create new users table without supabase_uid")
        print("   3. Copy data from old table")
        print("   4. Drop old table and rename new table")

    print("\n" + "=" * 80)
    print("⚠️  ROLLBACK REQUIRES MANUAL INTERVENTION")
    print("=" * 80)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
