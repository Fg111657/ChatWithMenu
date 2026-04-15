#!/usr/bin/env python3
"""
Update existing restaurants with dietary tags for testing
"""

from sqlalchemy import create_engine, text
import os
import json

def get_database_url():
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'

# Dietary tag assignments based on restaurant names/types
DIETARY_UPDATES = [
    # ID will be selected by name pattern matching
    {"pattern": "Italian", "tags": ["vegetarian-friendly", "gluten-free-options"]},
    {"pattern": "Mexican", "tags": ["vegan-friendly", "gluten-free-options"]},
    {"pattern": "Thai", "tags": ["vegan-friendly", "gluten-free-options", "nut-allergy-warning"]},
    {"pattern": "Indian", "tags": ["vegetarian-friendly", "vegan-friendly", "halal"]},
    {"pattern": "vegan", "tags": ["vegan", "gluten-free-options"]},
    {"pattern": "Cafe", "tags": ["vegetarian-friendly", "gluten-free-options"]},
    {"pattern": "Mediterranean", "tags": ["vegetarian-friendly", "vegan-friendly", "halal"]},
    {"pattern": "Sushi", "tags": ["gluten-free-options"]},
    {"pattern": "Japanese", "tags": ["gluten-free-options"]},
]

def update_dietary_tags():
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Updating dietary tags in database: {database_url}")

    with engine.connect() as conn:
        # Get all restaurants
        result = conn.execute(text("SELECT id, name, cuisine_type FROM restaurants"))
        restaurants = result.fetchall()

        updated_count = 0

        for restaurant in restaurants:
            rest_id, name, cuisine = restaurant
            tags = []

            # Match patterns and assign tags
            search_text = f"{name} {cuisine or ''}".lower()

            for rule in DIETARY_UPDATES:
                if rule["pattern"].lower() in search_text:
                    tags.extend(rule["tags"])

            # Remove duplicates
            tags = list(set(tags))

            # Update if we have tags
            if tags:
                tags_json = json.dumps(tags)
                conn.execute(text("""
                    UPDATE restaurants
                    SET dietary_tags = :tags
                    WHERE id = :id
                """), {"id": rest_id, "tags": tags_json})
                print(f"Updated {name}: {tags}")
                updated_count += 1

        conn.commit()

    print(f"\n✓ Updated {updated_count} restaurants with dietary tags!")

if __name__ == '__main__':
    update_dietary_tags()
