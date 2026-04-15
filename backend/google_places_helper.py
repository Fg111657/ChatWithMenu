"""
Google Places API helper with strict TTL caching
Only calls Google when necessary (new restaurant, stale data >30 days, or forced refresh)
"""

import os
import requests
import json
from datetime import datetime, timedelta

# Load API key from environment
GOOGLE_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY')
TTL_DAYS = 30


def is_fresh(enriched_at):
    """Check if Google data is fresh (< 30 days old)"""
    if not enriched_at:
        return False

    # Handle both datetime objects and ISO strings
    if isinstance(enriched_at, str):
        try:
            enriched_at = datetime.fromisoformat(enriched_at.replace('Z', '+00:00'))
        except:
            return False

    age = datetime.now() - enriched_at
    return age < timedelta(days=TTL_DAYS)


def lookup_google_places(name, address=None):
    """
    Lookup restaurant on Google Places API
    Returns dict with: place_id, rating, user_ratings_total, address, phone, website, photos
    """
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_PLACES_API_KEY not configured")

    # Step 1: Text Search to find place_id
    query = f"{name} {address or ''}".strip()
    search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    search_params = {
        "query": query,
        "key": GOOGLE_API_KEY
    }

    search_response = requests.get(search_url, params=search_params, timeout=10)
    search_data = search_response.json()

    if search_data.get('status') != 'OK' or not search_data.get('results'):
        return None

    # Use first result
    place = search_data['results'][0]
    place_id = place.get('place_id')

    # Step 2: Get detailed info
    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    details_params = {
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,photos,url",
        "key": GOOGLE_API_KEY
    }

    details_response = requests.get(details_url, params=details_params, timeout=10)
    details_data = details_response.json()

    if details_data.get('status') != 'OK':
        return None

    result = details_data.get('result', {})

    # Extract photo references (store first 5)
    photos = result.get('photos', [])
    photo_refs = [p.get('photo_reference') for p in photos[:5]]

    return {
        'place_id': place_id,
        'rating': result.get('rating'),
        'user_ratings_total': result.get('user_ratings_total'),
        'address': result.get('formatted_address'),
        'phone': result.get('formatted_phone_number'),
        'website': result.get('website'),
        'photo_refs': photo_refs,
        'url': result.get('url'),
        'raw': result  # Full response for future use
    }


def get_photo_url(photo_reference, max_width=400):
    """Generate Google Photos URL from reference"""
    if not photo_reference or not GOOGLE_API_KEY:
        return None

    return f"https://maps.googleapis.com/maps/api/place/photo?maxwidth={max_width}&photo_reference={photo_reference}&key={GOOGLE_API_KEY}"


def get_v1_photo_content(place_id, photo_index=0, max_width=800):
    """Fetch photo binary content using new Places API v1.
    Returns (content_bytes, content_type) or (None, None) on failure.
    """
    if not place_id or not GOOGLE_API_KEY:
        return None, None
    try:
        import requests as req
        # Step 1: get photo resource names from Places v1
        v1_url = f'https://places.googleapis.com/v1/places/{place_id}'
        headers = {
            'X-Goog-Api-Key': GOOGLE_API_KEY,
            'X-Goog-FieldMask': 'photos'
        }
        r = req.get(v1_url, headers=headers, timeout=10)
        r.raise_for_status()
        photos = r.json().get('photos', [])
        if photo_index >= len(photos):
            return None, None
        photo_name = photos[photo_index].get('name')
        if not photo_name:
            return None, None
        # Step 2: fetch the actual image
        media_url = f'https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx={max_width}&key={GOOGLE_API_KEY}'
        img_resp = req.get(media_url, timeout=15)
        img_resp.raise_for_status()
        content_type = img_resp.headers.get('Content-Type', 'image/jpeg')
        return img_resp.content, content_type
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"get_v1_photo_content error: {e}", exc_info=True)
        return None, None
