#!/usr/bin/env python3
"""
Seed script for restaurant discovery test data
Adds 10 restaurants with varied cuisines, dietary tags, and other metadata
"""

from sqlalchemy import create_engine, text
import os
import sys
import json

# Add parent directory to path to import db_models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    pg_url = os.environ.get('DATABASE_URL')
    if pg_url:
        return pg_url
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'localdata.db')
    return f'sqlite:///{db_path}'

# Test restaurant data
RESTAURANTS = [
    {
        "name": "Bella Vita Italian Kitchen",
        "cuisine_type": "Italian",
        "description": "Authentic Italian cuisine with homemade pasta and wood-fired pizzas",
        "address": "123 Main St, New York, NY 10001",
        "phone": "(212) 555-0101",
        "dietary_tags": json.dumps(["vegetarian-friendly", "gluten-free-options"]),
        "hours_json": json.dumps({"mon-thu": "11:00-22:00", "fri-sat": "11:00-23:00", "sun": "12:00-21:00"}),
        "price_range": 2,
    },
    {
        "name": "El Sabor Mexican Grill",
        "cuisine_type": "Mexican",
        "description": "Traditional Mexican flavors with modern twists",
        "address": "456 Oak Ave, Los Angeles, CA 90015",
        "phone": "(323) 555-0202",
        "dietary_tags": json.dumps(["vegan-friendly", "gluten-free-options"]),
        "hours_json": json.dumps({"mon-sun": "10:00-22:00"}),
        "price_range": 1,
    },
    {
        "name": "Golden Dragon Chinese Restaurant",
        "cuisine_type": "Chinese",
        "description": "Szechuan and Cantonese specialties in a family atmosphere",
        "address": "789 Park Blvd, San Francisco, CA 94102",
        "phone": "(415) 555-0303",
        "dietary_tags": json.dumps(["vegetarian-friendly"]),
        "hours_json": json.dumps({"mon-sun": "11:30-21:30"}),
        "price_range": 2,
    },
    {
        "name": "Green Leaf Vegan Cafe",
        "cuisine_type": "American",
        "description": "100% plant-based comfort food and fresh juices",
        "address": "321 Elm St, Portland, OR 97201",
        "phone": "(503) 555-0404",
        "dietary_tags": json.dumps(["vegan", "gluten-free-options", "nut-free-options"]),
        "hours_json": json.dumps({"mon-fri": "8:00-20:00", "sat-sun": "9:00-18:00"}),
        "price_range": 2,
    },
    {
        "name": "Spice Route Indian Cuisine",
        "cuisine_type": "Indian",
        "description": "North Indian curries, tandoori, and biryanis",
        "address": "555 Broadway, Chicago, IL 60601",
        "phone": "(312) 555-0505",
        "dietary_tags": json.dumps(["vegetarian-friendly", "vegan-friendly", "halal"]),
        "hours_json": json.dumps({"mon-sun": "11:00-22:00"}),
        "price_range": 2,
    },
    {
        "name": "Bangkok Street Food",
        "cuisine_type": "Thai",
        "description": "Authentic Thai street food and noodle dishes",
        "address": "888 Market St, Seattle, WA 98101",
        "phone": "(206) 555-0606",
        "dietary_tags": json.dumps(["vegetarian-friendly", "vegan-friendly", "gluten-free-options"]),
        "hours_json": json.dumps({"tue-sun": "11:30-21:00"}),
        "price_range": 1,
    },
    {
        "name": "The Prime Steakhouse",
        "cuisine_type": "American",
        "description": "Premium cuts of beef and fine wine selection",
        "address": "100 Fifth Ave, Miami, FL 33101",
        "phone": "(305) 555-0707",
        "dietary_tags": json.dumps(["gluten-free-options"]),
        "hours_json": json.dumps({"mon-thu": "17:00-22:00", "fri-sat": "17:00-23:00", "sun": "closed"}),
        "price_range": 3,
    },
    {
        "name": "Sakura Japanese Sushi Bar",
        "cuisine_type": "Japanese",
        "description": "Fresh sushi, sashimi, and traditional Japanese dishes",
        "address": "222 Pine St, Boston, MA 02101",
        "phone": "(617) 555-0808",
        "dietary_tags": json.dumps(["gluten-free-options"]),
        "hours_json": json.dumps({"mon-sat": "12:00-22:00", "sun": "12:00-21:00"}),
        "price_range": 3,
    },
    {
        "name": "Mediterranean Mezze House",
        "cuisine_type": "Mediterranean",
        "description": "Shawarma, falafel, hummus, and fresh pita bread",
        "address": "777 Cedar Lane, Austin, TX 78701",
        "phone": "(512) 555-0909",
        "dietary_tags": json.dumps(["vegetarian-friendly", "vegan-friendly", "halal"]),
        "hours_json": json.dumps({"mon-sun": "11:00-21:00"}),
        "price_range": 1,
    },
    {
        "name": "French Bistro Le Petit",
        "cuisine_type": "French",
        "description": "Classic French bistro fare with seasonal specials",
        "address": "333 Maple Dr, Denver, CO 80201",
        "phone": "(303) 555-1010",
        "dietary_tags": json.dumps(["vegetarian-friendly"]),
        "hours_json": json.dumps({"tue-sat": "17:30-22:00", "sun-mon": "closed"}),
        "price_range": 3,
    },
]

def seed_restaurants():
    """Seed test restaurant data"""
    database_url = get_database_url()
    engine = create_engine(database_url)

    print(f"Seeding restaurants in database: {database_url}")

    with engine.connect() as conn:
        # Check how many restaurants already exist
        result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
        existing_count = result.fetchone()[0]
        print(f"Found {existing_count} existing restaurants")

        if existing_count >= 5:
            print("✓ Database already has sufficient test data. Skipping seed.")
            return

        # Insert test restaurants (user_id = 0 for system/test data)
        for idx, restaurant in enumerate(RESTAURANTS):
            print(f"Adding restaurant {idx+1}/10: {restaurant['name']}")

            conn.execute(text("""
                INSERT INTO restaurants
                (user_id, name, cuisine_type, description, address, phone, dietary_tags, hours_json, price_range)
                VALUES
                (:user_id, :name, :cuisine_type, :description, :address, :phone, :dietary_tags, :hours_json, :price_range)
            """), {
                "user_id": 0,  # System/test user
                "name": restaurant["name"],
                "cuisine_type": restaurant["cuisine_type"],
                "description": restaurant["description"],
                "address": restaurant["address"],
                "phone": restaurant["phone"],
                "dietary_tags": restaurant["dietary_tags"],
                "hours_json": restaurant["hours_json"],
                "price_range": restaurant["price_range"],
            })

        conn.commit()

    print("✓ Successfully seeded 10 test restaurants!")
    print("\nCuisine types added:")
    print("  - Italian, Mexican, Chinese, American (2)")
    print("  - Indian, Thai, Japanese, Mediterranean, French")
    print("\nDietary tags included:")
    print("  - vegan, vegan-friendly, vegetarian-friendly")
    print("  - gluten-free-options, halal, nut-free-options")

if __name__ == '__main__':
    seed_restaurants()
