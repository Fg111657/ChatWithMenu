#!/usr/bin/env python3
"""
Test script to explore Google Places API data
Run this after setting GOOGLE_PLACES_API_KEY environment variable
"""

import os
import sys
import json
import requests
from typing import Dict, Any

# Get API key from environment
API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY')

if not API_KEY:
    print("❌ ERROR: GOOGLE_PLACES_API_KEY not set")
    print("\nSet it with:")
    print('  export GOOGLE_PLACES_API_KEY="your-key-here"')
    sys.exit(1)

# Test restaurant (you can change this)
TEST_RESTAURANT = {
    "name": "Il Violino",
    "address": "New York, NY"  # Add actual address if known
}


def test_text_search(query: str) -> Dict[str, Any]:
    """
    Test Google Places Text Search API

    Returns: Restaurant matches with basic info
    """
    print(f"\n{'='*60}")
    print(f"🔍 Testing Text Search: '{query}'")
    print(f"{'='*60}\n")

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": query,
        "key": API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "OK":
            print(f"⚠️  API Status: {data.get('status')}")
            print(f"   Error: {data.get('error_message', 'No error message')}")
            return {}

        results = data.get("results", [])
        print(f"✅ Found {len(results)} results\n")

        if results:
            # Show first result details
            top = results[0]
            print("📍 TOP RESULT:")
            print(f"   Name: {top.get('name')}")
            print(f"   Address: {top.get('formatted_address')}")
            print(f"   Place ID: {top.get('place_id')}")
            print(f"   Rating: {top.get('rating')} ({top.get('user_ratings_total')} reviews)")
            print(f"   Price Level: {top.get('price_level', 'N/A')}")
            print(f"   Types: {', '.join(top.get('types', [])[:5])}")
            print(f"   Business Status: {top.get('business_status')}")

            if top.get('opening_hours'):
                print(f"   Open Now: {top['opening_hours'].get('open_now')}")

            if top.get('geometry'):
                loc = top['geometry']['location']
                print(f"   Location: {loc.get('lat')}, {loc.get('lng')}")

            # Show available fields from response
            print(f"\n📋 AVAILABLE FIELDS IN TEXT SEARCH:")
            available_fields = list(top.keys())
            for field in sorted(available_fields):
                print(f"   - {field}")

            return top

        return {}

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {}


def test_place_details(place_id: str) -> Dict[str, Any]:
    """
    Test Google Places Details API

    Returns: Full restaurant details including hours, photos, reviews, etc.
    """
    print(f"\n{'='*60}")
    print(f"🔍 Testing Place Details for: {place_id}")
    print(f"{'='*60}\n")

    url = "https://maps.googleapis.com/maps/api/place/details/json"

    # Request ALL available fields
    fields = [
        # Basic Info
        "place_id", "name", "formatted_address", "formatted_phone_number",
        "international_phone_number", "website", "url",

        # Ratings & Reviews
        "rating", "user_ratings_total", "reviews",

        # Hours & Availability
        "opening_hours", "business_status", "utc_offset_minutes",

        # Location
        "geometry", "vicinity", "adr_address",

        # Categories & Types
        "types", "price_level",

        # Media
        "photos",

        # Other
        "editorial_summary", "serves_breakfast", "serves_lunch", "serves_dinner",
        "serves_beer", "serves_wine", "serves_brunch", "serves_vegetarian_food",
        "takeout", "delivery", "dine_in", "reservable", "wheelchair_accessible_entrance"
    ]

    params = {
        "place_id": place_id,
        "fields": ",".join(fields),
        "key": API_KEY
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "OK":
            print(f"⚠️  API Status: {data.get('status')}")
            return {}

        result = data.get("result", {})

        # Print organized details
        print("📍 DETAILED INFORMATION:")
        print(f"\n🏪 Basic Info:")
        print(f"   Name: {result.get('name')}")
        print(f"   Address: {result.get('formatted_address')}")
        print(f"   Phone: {result.get('formatted_phone_number')}")
        print(f"   Website: {result.get('website', 'N/A')}")
        print(f"   Google Maps URL: {result.get('url', 'N/A')}")

        print(f"\n⭐ Ratings & Reviews:")
        print(f"   Rating: {result.get('rating')} / 5.0")
        print(f"   Total Reviews: {result.get('user_ratings_total')}")
        print(f"   Price Level: {'$' * result.get('price_level', 0) if result.get('price_level') else 'N/A'}")

        # Reviews preview
        reviews = result.get('reviews', [])
        if reviews:
            print(f"\n   Recent Reviews (showing {min(2, len(reviews))} of {len(reviews)}):")
            for i, review in enumerate(reviews[:2], 1):
                print(f"\n   Review #{i}:")
                print(f"     Author: {review.get('author_name')}")
                print(f"     Rating: {review.get('rating')}/5")
                print(f"     Text: {review.get('text', '')[:100]}...")
                print(f"     Time: {review.get('relative_time_description')}")

        print(f"\n🕒 Hours & Availability:")
        print(f"   Business Status: {result.get('business_status')}")
        opening_hours = result.get('opening_hours', {})
        if opening_hours:
            print(f"   Open Now: {opening_hours.get('open_now')}")
            weekday_text = opening_hours.get('weekday_text', [])
            if weekday_text:
                print(f"   Hours:")
                for day in weekday_text:
                    print(f"     {day}")

        print(f"\n🍽️  Dining Options:")
        dining_features = {
            'Breakfast': result.get('serves_breakfast'),
            'Lunch': result.get('serves_lunch'),
            'Dinner': result.get('serves_dinner'),
            'Brunch': result.get('serves_brunch'),
            'Beer': result.get('serves_beer'),
            'Wine': result.get('serves_wine'),
            'Vegetarian': result.get('serves_vegetarian_food'),
            'Takeout': result.get('takeout'),
            'Delivery': result.get('delivery'),
            'Dine-in': result.get('dine_in'),
            'Reservations': result.get('reservable'),
            'Wheelchair Accessible': result.get('wheelchair_accessible_entrance')
        }

        for feature, value in dining_features.items():
            if value is not None:
                icon = "✅" if value else "❌"
                print(f"   {icon} {feature}")

        print(f"\n📸 Photos:")
        photos = result.get('photos', [])
        print(f"   {len(photos)} photos available")
        if photos:
            print(f"   Example photo reference: {photos[0].get('photo_reference')[:50]}...")
            print(f"   Photo URL format: https://maps.googleapis.com/maps/api/place/photo")
            print(f"                     ?maxwidth=400&photo_reference=<ref>&key=<key>")

        print(f"\n🏷️  Categories:")
        types = result.get('types', [])
        print(f"   {', '.join(types[:10])}")

        # Editorial summary (if available)
        if result.get('editorial_summary'):
            print(f"\n📝 Editorial Summary:")
            print(f"   {result['editorial_summary'].get('overview', 'N/A')}")

        # Show ALL available fields
        print(f"\n📋 ALL AVAILABLE FIELDS IN DETAILS API:")
        available_fields = list(result.keys())
        for field in sorted(available_fields):
            value = result[field]
            value_type = type(value).__name__

            if isinstance(value, (dict, list)):
                count = len(value)
                print(f"   - {field}: {value_type} ({count} items)")
            else:
                print(f"   - {field}: {value_type}")

        return result

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {}


def main():
    """Run full test suite"""
    print(f"\n{'#'*60}")
    print(f"# Google Places API Test Suite")
    print(f"# API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
    print(f"{'#'*60}")

    # Step 1: Text Search
    query = f"{TEST_RESTAURANT['name']} {TEST_RESTAURANT['address']}"
    search_result = test_text_search(query)

    if not search_result:
        print("\n❌ No results from text search. Try a different restaurant or check API key.")
        return

    # Step 2: Get detailed info
    place_id = search_result.get('place_id')
    if place_id:
        details_result = test_place_details(place_id)

        # Save results to file for review
        output = {
            "text_search": search_result,
            "place_details": details_result
        }

        output_file = "google_places_api_test_results.json"
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)

        print(f"\n{'='*60}")
        print(f"✅ Test Complete!")
        print(f"📄 Full results saved to: {output_file}")
        print(f"{'='*60}\n")

    print("\n💡 SUMMARY OF USEFUL DATA FOR CHATWITHMENU.COM:")
    print("   ✅ Rating & review count (trust indicator)")
    print("   ✅ Full address & phone (contact info)")
    print("   ✅ Opening hours (when to visit)")
    print("   ✅ Photos (visual appeal)")
    print("   ✅ Reviews with text (social proof)")
    print("   ✅ Price level (dining budget)")
    print("   ✅ Dining options (takeout, delivery, reservations)")
    print("   ✅ Vegetarian options flag")
    print("   ✅ Wheelchair accessibility")
    print("   ✅ Website & Google Maps link")
    print("\n💰 Cost: ~$0.017 per text search + $0.017 per details request")
    print("   Strategy: Cache results for 30+ days to minimize costs")


if __name__ == "__main__":
    main()
