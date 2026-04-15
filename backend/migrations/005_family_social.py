#!/usr/bin/env python3
"""
Migration 005: Family & Social Features
Adds family members, social connections, and enhanced user profiles
"""

from sqlalchemy import create_engine, text
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'

def run_migration():
    """Apply the migration"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Running migration 005 on database: {database_url}")

    with engine.connect() as conn:
        if 'postgresql' in database_url:
            # PostgreSQL syntax
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='users' AND column_name='display_name'
            """))
            if result.fetchone():
                print("✓ Migration already applied. Skipping.")
                return

            # Add columns to users table
            print("Adding display_name, photo_url, bio to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(100)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN photo_url TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
            conn.execute(text("ALTER TABLE users ADD COLUMN privacy_level VARCHAR(20) DEFAULT 'friends'"))
            conn.execute(text("ALTER TABLE users ADD COLUMN show_allergies BOOLEAN DEFAULT TRUE"))

            # Create family_members table
            print("Creating family_members table...")
            conn.execute(text("""
                CREATE TABLE family_members (
                    id SERIAL PRIMARY KEY,
                    parent_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    age INTEGER,
                    relationship VARCHAR(50) DEFAULT 'child',
                    photo_url TEXT,
                    emergency_contact TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create family_member_allergies table
            print("Creating family_member_allergies table...")
            conn.execute(text("""
                CREATE TABLE family_member_allergies (
                    id SERIAL PRIMARY KEY,
                    family_member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE NOT NULL,
                    ingredient VARCHAR(255) NOT NULL,
                    restriction_type VARCHAR(50) DEFAULT 'Allergy',
                    severity VARCHAR(20) DEFAULT 'High',
                    notes TEXT
                )
            """))

            # Add family_mode to chats
            print("Adding family_mode to chats...")
            conn.execute(text("ALTER TABLE chats ADD COLUMN family_mode BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE chats ADD COLUMN active_family_members TEXT"))

            # Create indexes
            print("Creating indexes...")
            conn.execute(text("CREATE INDEX idx_family_members_parent ON family_members(parent_user_id)"))
            conn.execute(text("CREATE INDEX idx_family_allergies_member ON family_member_allergies(family_member_id)"))

            conn.commit()

        else:
            # SQLite syntax
            result = conn.execute(text("PRAGMA table_info(users)"))
            user_columns = [row[1] for row in result.fetchall()]

            # Check if family_members table already exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='family_members'"))
            if result.fetchone():
                print("✓ Migration already applied. Skipping.")
                return

            # Add columns to users table (only if they don't exist)
            print("Adding columns to users table...")
            if 'display_name' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR(100)"))
            if 'photo_url' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN photo_url TEXT"))
            if 'bio' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
            if 'privacy_level' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN privacy_level VARCHAR(20) DEFAULT 'friends'"))
            if 'show_allergies' not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN show_allergies INTEGER DEFAULT 1"))

            # Create family_members table
            print("Creating family_members table...")
            conn.execute(text("""
                CREATE TABLE family_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    parent_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(100) NOT NULL,
                    age INTEGER,
                    relationship VARCHAR(50) DEFAULT 'child',
                    photo_url TEXT,
                    emergency_contact TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create family_member_allergies table
            print("Creating family_member_allergies table...")
            conn.execute(text("""
                CREATE TABLE family_member_allergies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    family_member_id INTEGER NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
                    ingredient VARCHAR(255) NOT NULL,
                    restriction_type VARCHAR(50) DEFAULT 'Allergy',
                    severity VARCHAR(20) DEFAULT 'High',
                    notes TEXT
                )
            """))

            # Add family_mode to chats
            print("Adding family_mode to chats...")
            conn.execute(text("ALTER TABLE chats ADD COLUMN family_mode INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE chats ADD COLUMN active_family_members TEXT"))

            # Create indexes
            print("Creating indexes...")
            conn.execute(text("CREATE INDEX idx_family_members_parent ON family_members(parent_user_id)"))
            conn.execute(text("CREATE INDEX idx_family_allergies_member ON family_member_allergies(family_member_id)"))

            conn.commit()

    print("✓ Migration 005 completed successfully!")
    print("\nNew features enabled:")
    print("  - Family member management")
    print("  - Family allergy profiles")
    print("  - Family mode in chat")
    print("  - Enhanced user profiles")

def rollback_migration():
    """Rollback the migration (for development only)"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Rolling back migration 005 on database: {database_url}")

    with engine.connect() as conn:
        if 'postgresql' in database_url:
            conn.execute(text("DROP TABLE IF EXISTS family_member_allergies CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS family_members CASCADE"))
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS display_name"))
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS photo_url"))
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS bio"))
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS privacy_level"))
            conn.execute(text("ALTER TABLE users DROP COLUMN IF EXISTS show_allergies"))
            conn.execute(text("ALTER TABLE chats DROP COLUMN IF EXISTS family_mode"))
            conn.execute(text("ALTER TABLE chats DROP COLUMN IF EXISTS active_family_members"))
            conn.commit()
        else:
            print("WARNING: SQLite doesn't support DROP COLUMN easily.")
            print("Manual rollback required or recreate database.")

    print("✓ Migration 005 rolled back!")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback_migration()
    else:
        run_migration()
