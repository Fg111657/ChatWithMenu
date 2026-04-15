# Google Places API Integration Guide

## Overview
This document explains what data we can access with the Google Places API and how to set it up for ChatWithMenu.com.

---

## What Data Can We Access?

### 1. **Text Search API** (Find Restaurants)
**Endpoint:** `https://maps.googleapis.com/maps/api/place/textsearch/json`

**What it returns:**
```json
{
  "name": "Il Violino",
  "formatted_address": "123 Main St, New York, NY 10001",
  "place_id": "ChIJd8BlQ2FZwokRAFUEcm_qrcA",
  "rating": 4.5,
  "user_ratings_total": 423,
  "price_level": 2,
  "types": ["restaurant", "food", "point_of_interest"],
  "business_status": "OPERATIONAL",
  "geometry": {
    "location": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "opening_hours": {
    "open_now": true
  }
}
```

**Use Case:** Match our restaurant database to Google's data

**Cost:** ~$0.017 per request (charged as 1 Text Search SKU)

---

### 2. **Place Details API** (Get Full Restaurant Info)
**Endpoint:** `https://maps.googleapis.com/maps/api/place/details/json`

**What it returns (RICH DATA):**

#### 🏪 Basic Information
- `name` - Restaurant name
- `formatted_address` - Full address
- `formatted_phone_number` - Phone with country code
- `international_phone_number` - International format
- `website` - Restaurant website URL
- `url` - Google Maps link
- `vicinity` - Neighborhood/area

#### ⭐ Ratings & Social Proof
- `rating` - Average rating (0-5)
- `user_ratings_total` - Number of reviews
- `reviews` - Array of recent reviews with:
  - `author_name` - Reviewer name
  - `rating` - Individual rating
  - `text` - Review text
  - `time` - Timestamp
  - `relative_time_description` - "2 weeks ago"
  - `profile_photo_url` - Reviewer photo

#### 🕒 Hours & Availability
- `opening_hours` - Structured hours data:
  - `open_now` - Boolean
  - `weekday_text` - ["Monday: 11:00 AM – 10:00 PM", ...]
  - `periods` - Structured open/close times
- `business_status` - "OPERATIONAL" / "CLOSED_TEMPORARILY" / "CLOSED_PERMANENTLY"
- `utc_offset_minutes` - Timezone offset

#### 🍽️ Dining Features (NEW!)
- `serves_breakfast` - Boolean
- `serves_lunch` - Boolean
- `serves_dinner` - Boolean
- `serves_brunch` - Boolean
- `serves_beer` - Boolean
- `serves_wine` - Boolean
- `serves_vegetarian_food` - Boolean ✅ **Useful for allergy/dietary app!**
- `takeout` - Boolean
- `delivery` - Boolean
- `dine_in` - Boolean
- `reservable` - Boolean
- `wheelchair_accessible_entrance` - Boolean

#### 📸 Photos
- `photos` - Array of photo references:
  - `photo_reference` - Reference ID to fetch photo
  - `height` / `width` - Dimensions
  - `html_attributions` - Required attribution text

**Photo URL Format:**
```
https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=<ref>&key=<api_key>
```

#### 🏷️ Categories & Metadata
- `types` - ["restaurant", "italian_restaurant", "bar", ...]
- `price_level` - 0-4 ($ to $$$$)
- `editorial_summary` - Google's AI-generated summary (NEW!)

#### 📍 Location Data
- `geometry.location` - Exact lat/lng coordinates
- `geometry.viewport` - Bounding box for map display

**Cost:** ~$0.017 per request (charged per field group, but basic fields are cheap)

---

## What This Means for ChatWithMenu.com UX

### Phase 1: Trust Indicators (Immediate Value)
**Show in Overview:**
- ✅ Google rating (4.5 ⭐) + review count (423 reviews)
- ✅ "Verified on Google" badge
- ✅ Price level ($$)
- ✅ Business status (Open now / Closed temporarily)

**UX Impact:**
- Diners trust restaurants with Google ratings
- Shows we're connected to real, verified places
- Helps users decide if restaurant is in their budget

### Phase 2: Complete Contact Info (Fill Gaps)
**Auto-populate missing fields:**
- ✅ Address (if missing in our DB)
- ✅ Phone number
- ✅ Website link
- ✅ Opening hours (structured data)

**UX Impact:**
- No more "Address not set" empty states
- Users can call/visit without leaving app
- Professional, complete restaurant profiles

### Phase 3: Visual Appeal (Photos)
**Add to Overview:**
- ✅ Restaurant photos from Google (carousel)
- ✅ Proper attribution

**UX Impact:**
- Cards go from "database admin panel" to "real restaurant"
- Users can see the ambiance before visiting
- Increases engagement and trust

### Phase 4: Social Proof (Reviews)
**Add Reviews tab enhancement:**
- ✅ Pull in Google reviews alongside our internal reviews
- ✅ Show reviewer names + photos
- ✅ "Read more on Google" link

**UX Impact:**
- More reviews = more trust
- Combines internal allergy-focused reviews with general Google reviews
- Shows we're part of the broader restaurant ecosystem

### Phase 5: Dietary Intelligence (UNIQUE VALUE)
**Combine with our allergy data:**
- ✅ Google says "serves_vegetarian_food: true"
- ✅ We have ingredient-level allergen data
- ✅ = "Vegetarian options available, verified allergen-free"

**UX Impact:**
- Google data validates our dietary tags
- Cross-reference their flags with our detailed menu data
- Best of both worlds: broad coverage + deep accuracy

---

## API Cost Analysis

### Pricing (2026 Rates)
- **Text Search:** $17 per 1,000 requests
- **Place Details (Basic):** $17 per 1,000 requests
- **Place Details (Contact):** $3 per 1,000 requests
- **Place Details (Atmosphere):** $3 per 1,000 requests
- **Photos:** Free (with attribution)

### Cost Optimization Strategy

#### ✅ DO (Safe & Cheap)
1. **Fetch on-demand only** (when user clicks restaurant)
2. **Cache aggressively:**
   - Store Google data in our database
   - TTL: 30-90 days (Google data doesn't change often)
   - Invalidate only when restaurant updates
3. **Background enrichment:**
   - Cron job enriches 10-20 restaurants per day
   - Prioritize popular/new restaurants
   - = ~$0.34/day = $10/month for 300 restaurants/month

#### ❌ DON'T (Expensive)
- ❌ Fetch Google data on every page load
- ❌ Real-time lookups for all restaurants
- ❌ Fetch photos we don't display

### Example Budget
**Scenario:** 100 restaurants, 1,000 monthly users
- Initial enrichment: 100 restaurants × $0.034 = **$3.40 one-time**
- Monthly updates: 100 restaurants × $0.034 = **$3.40/month**
- User-triggered lookups: ~50 new requests/month = **$1.70/month**
- **Total:** ~$5-10/month

**ROI:** Massive. Google ratings/photos increase conversion significantly.

---

## Setup Instructions

### Step 1: Get Google Places API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable APIs:
   - Places API (New)
   - Maps JavaScript API (if showing maps later)
4. Create credentials → API Key
5. Restrict the key:
   - **Application restrictions:** HTTP referrers or IP addresses
   - **API restrictions:** Only "Places API"
6. Copy the API key

### Step 2: Add to Backend Environment

**Option A: Environment Variable (Recommended)**
```bash
cd /var/www/chatwithmenu/Backend/python
export GOOGLE_PLACES_API_KEY="your-key-here"
```

**Option B: .env file (Persistent)**
```bash
echo 'GOOGLE_PLACES_API_KEY="your-key-here"' >> /var/www/chatwithmenu/Backend/python/.env
```

Then update `server.py` to load .env:
```python
from dotenv import load_dotenv
load_dotenv()

GOOGLE_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY')
```

### Step 3: Test the API

Run the test script I created:
```bash
cd /var/www/chatwithmenu/Backend/python
export GOOGLE_PLACES_API_KEY="your-key-here"
python3 test_google_places.py
```

This will:
- ✅ Search for "Il Violino" (or change restaurant in script)
- ✅ Fetch full details
- ✅ Print all available fields
- ✅ Save results to `google_places_api_test_results.json`

### Step 4: Review the Output

Check the generated JSON file to see:
- What fields are populated
- Quality of data (ratings, reviews, hours)
- Photo references available

---

## Recommended Implementation Plan

### MVP (Week 1)
**Goal:** Show Google rating + review count in Overview

1. Add backend endpoint: `GET /api/restaurant/:id/google_enrich`
2. On first call, fetch from Google and cache in DB
3. Return cached data on subsequent calls
4. Frontend: Show "⭐ 4.5 (423 Google reviews)" in Overview

**Effort:** 2-3 hours
**Impact:** Immediate trust boost
**Cost:** ~$3 initial enrichment for 100 restaurants

### Phase 2 (Week 2)
**Goal:** Auto-fill missing contact info

1. Add "Sync with Google" button (Admin/Merchant only)
2. Pull address, phone, hours, website
3. Update restaurant record in DB
4. Show "Last synced with Google: 2 days ago"

**Effort:** 3-4 hours
**Impact:** Complete restaurant profiles
**Cost:** Same as MVP (one-time per restaurant)

### Phase 3 (Week 3)
**Goal:** Restaurant photos

1. Fetch 3-5 photos from Google
2. Store photo_references in DB
3. Show photo carousel in Overview
4. Add proper Google attribution

**Effort:** 4-5 hours
**Impact:** Professional, visual cards
**Cost:** Free (photos are free with attribution)

### Phase 4 (Optional)
**Goal:** Merge Google reviews with our reviews

1. Pull 5-10 recent Google reviews
2. Store in separate table
3. Show both sources in Reviews tab
4. "See all on Google" link

**Effort:** 5-6 hours
**Impact:** More social proof
**Cost:** Same as MVP

---

## Data We CANNOT Get (Limitations)

❌ **Menu items** - Google doesn't have ingredient-level data
❌ **Allergen info** - Google has no allergy data (our unique value!)
❌ **Real-time wait times** - Only available to business owners
❌ **Reservation availability** - Need integration with OpenTable/Resy
❌ **Popular dishes** - Google has "popular times" but not dish-level data

**Conclusion:** Google complements our data, doesn't replace it. We're still the allergy/dietary experts.

---

## Next Steps

1. **Get API Key** (5 minutes)
2. **Run test script** (2 minutes)
3. **Review output** (10 minutes)
4. **Decide which fields to use** (based on test results)
5. **Implement MVP** (2-3 hours)

Once you have the API key and run the test, we'll see exactly what data is available for your restaurants and can make informed UX decisions.
