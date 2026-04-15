#!/usr/bin/env python3
"""
Migration: Add Google Places cache columns to restaurants table
Run once to update existing database schema
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'localdata.db')

def migrate():
    print(f"Migrating database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if columns already exist
    cursor.execute("PRAGMA table_info(restaurants)")
    existing_columns = [row[1] for row in cursor.fetchall()]

    columns_to_add = [
        ('google_place_id', 'TEXT'),
        ('google_rating', 'REAL'),
        ('google_user_ratings_total', 'INTEGER'),
        ('google_address', 'TEXT'),
        ('google_phone', 'TEXT'),
        ('google_website', 'TEXT'),
        ('google_photo_refs', 'TEXT'),
        ('google_enriched_at', 'TIMESTAMP'),
        ('google_raw', 'TEXT'),
    ]

    added_count = 0
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE restaurants ADD COLUMN {col_name} {col_type}")
                print(f"✅ Added column: {col_name}")
                added_count += 1
            except sqlite3.OperationalError as e:
                print(f"⚠️  Column {col_name} may already exist: {e}")
        else:
            print(f"⏭️  Column {col_name} already exists, skipping")

    conn.commit()
    conn.close()

    print(f"\n✅ Migration complete! Added {added_count} columns.")
    print("\nNew columns:")
    for col_name, col_type in columns_to_add:
        print(f"  - {col_name}: {col_type}")

if __name__ == "__main__":
    migrate()
