#!/usr/bin/env python3
"""
Batch enrichment script - Populate Google cache safely
- Rate limited: 1 request per second
- Respects TTL: Skips fresh data (<30 days old)
- No frontend involvement
- One-time controlled job
"""

# CRITICAL: Load .env BEFORE importing google_places_helper (it reads API key at import time)
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except:
    pass

# Now import modules that depend on environment variables
import time
import json
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import db_models
import google_places_helper

# Verify API key loaded
if not os.environ.get('GOOGLE_PLACES_API_KEY'):
    print("❌ GOOGLE_PLACES_API_KEY not found in environment!")
    print("   Check /var/www/chatwithmenu/Backend/python/.env file exists")
    sys.exit(1)
else:
    print(f"✅ Google API key loaded successfully")

# Rate limiting
SLEEP_SECONDS = 1.0  # Protect CPU + Google quota
MAX_RESTAURANTS = None  # Full batch - enrich all restaurants

# Database connection (hardcoded to match server.py - eliminates path confusion)
DB_URL = "sqlite:////var/www/chatwithmenu/Backend/python/localdata.db"

class GetDB:
    def __init__(self):
        engine = create_engine(DB_URL)
        Session = sessionmaker(bind=engine)
        self.db = Session()

    def __enter__(self):
        return self.db

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()

def is_stale(dt):
    """Check if enriched_at timestamp is stale (>30 days or None)"""
    return (dt is None) or (not google_places_helper.is_fresh(dt))

def main():
    ok = 0
    fail = 0
    skipped = 0

    print("=" * 60)
    print("Google Places Batch Enrichment")
    print("=" * 60)
    print(f"Rate limit: {SLEEP_SECONDS}s per request")
    print(f"Max restaurants: {MAX_RESTAURANTS or 'ALL'}")
    print()

    # Get all restaurants
    with GetDB() as db:
        restaurants = db.query(db_models.Restaurant).all()

    if MAX_RESTAURANTS:
        restaurants = restaurants[:MAX_RESTAURANTS]

    total = len(restaurants)
    print(f"Processing {total} restaurants...\n")

    for idx, r in enumerate(restaurants, 1):
        prefix = f"[{idx}/{total}]"

        try:
            # Re-open DB session per iteration
            with GetDB() as db:
                restaurant = db.query(db_models.Restaurant).get(r.id)
                if not restaurant:
                    continue

                # Skip if fresh (respect TTL)
                if restaurant.google_place_id and not is_stale(restaurant.google_enriched_at):
                    print(f"{prefix} [SKIP] {restaurant.id:3d} {restaurant.name:40s} (fresh, {(datetime.now() - restaurant.google_enriched_at).days}d old)")
                    skipped += 1
                    continue

                # Call Google Places API
                print(f"{prefix} [CALL] {restaurant.id:3d} {restaurant.name:40s}...", end=" ", flush=True)

                # Use address with safe fallback pattern
                # Priority: restaurant.address > google_address > None
                search_address = None
                if restaurant.address:
                    search_address = restaurant.address
                elif restaurant.google_address:
                    search_address = restaurant.google_address
                # If both are None, lookup by name only (risky but allows enrichment)

                google_data = google_places_helper.lookup_google_places(
                    name=restaurant.name,
                    address=search_address
                )

                if not google_data:
                    print(f"❌ NOT FOUND")
                    fail += 1
                    time.sleep(SLEEP_SECONDS)
                    continue

                # Update database
                restaurant.google_place_id = google_data["place_id"]
                restaurant.google_rating = google_data["rating"]
                restaurant.google_user_ratings_total = google_data["user_ratings_total"]
                restaurant.google_address = google_data["address"]
                restaurant.google_phone = google_data["phone"]
                restaurant.google_website = google_data["website"]
                restaurant.google_photo_refs = json.dumps(google_data["photo_refs"])
                restaurant.google_raw = json.dumps(google_data["raw"])
                restaurant.google_enriched_at = datetime.now()

                db_models.transact(db)

                rating = google_data["rating"] or "N/A"
                photos = len(google_data["photo_refs"])
                print(f"✅ rating={rating} photos={photos}")
                ok += 1

        except Exception as e:
            print(f"{prefix} [ERR] {r.id:3d} {r.name:40s}: {e}")
            fail += 1

        # Rate limit between requests
        time.sleep(SLEEP_SECONDS)

    print()
    print("=" * 60)
    print(f"✅ Success: {ok}")
    print(f"⏭️  Skipped: {skipped} (fresh, within TTL)")
    print(f"❌ Failed:  {fail}")
    print(f"📊 Total:   {total}")
    print("=" * 60)

if __name__ == "__main__":
    main()
