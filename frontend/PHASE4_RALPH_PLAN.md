# PHASE 4: RESTAURANT DISCOVERY - RALPH PLAN

## PHASE STATUS
- **Current State**: DashboardScreen shows simple list of all restaurants
- **Target State**: Full restaurant discovery with search, filters, details view
- **Priority**: CRITICAL (0% complete, blocks Phase 5 & 6)

---

## R - REQUIREMENTS

### 1. Functional Requirements

#### 1.1 Search & Browse
- [ ] Search restaurants by name (case-insensitive, partial match)
- [ ] Filter by cuisine type (Italian, Mexican, Chinese, etc.)
- [ ] Filter by dietary-friendly options (vegan, gluten-free, halal, kosher)
- [ ] Sort by: name (A-Z), rating (high-low), distance (if geolocation available)

#### 1.2 Restaurant Details View
- [ ] View full restaurant info (name, cuisine, hours, contact)
- [ ] Display all menus for the restaurant
- [ ] Show aggregate rating (average of reviews)
- [ ] Show recent reviews (top 5)
- [ ] "Start Chat" button to navigate to ChatScreen

#### 1.3 Enhanced Restaurant List
- [ ] Display cuisine type on restaurant cards
- [ ] Show rating stars + count (e.g., "4.5 ★ (24 reviews)")
- [ ] Show dietary badges (vegan-friendly, gluten-free, etc.)
- [ ] Empty state when no results found

### 2. Non-Functional Requirements

#### 2.1 Performance
- [ ] Search/filter operations complete in <500ms
- [ ] Pagination if >50 restaurants (show 20 per page)
- [ ] Lazy load restaurant images

#### 2.2 Security
- [ ] All API calls use JWT auth (already implemented)
- [ ] No exposure of sensitive restaurant data (owner contact info)
- [ ] Prevent XSS in search inputs (sanitize)

#### 2.3 UX
- [ ] Mobile-responsive design (existing MUI components)
- [ ] Loading skeletons while fetching data
- [ ] Clear "No results" message when filters yield nothing

---

## A - ARCHITECTURE

### 1. Database Schema Changes

**Restaurants Table (MODIFY)**
```sql
ALTER TABLE restaurants ADD COLUMN cuisine_type VARCHAR(50);
ALTER TABLE restaurants ADD COLUMN address TEXT;
ALTER TABLE restaurants ADD COLUMN phone VARCHAR(20);
ALTER TABLE restaurants ADD COLUMN hours TEXT; -- JSON string: {"mon": "9-5", "tue": "9-5"}
ALTER TABLE restaurants ADD COLUMN dietary_tags TEXT; -- JSON array: ["vegan-friendly", "gluten-free"]
```

**Reviews Table (VERIFY EXISTS)**
```sql
-- Already exists based on dataService.submitReview/listUserRestaurantReviews
-- Verify columns: id, user_id, restaurant_id, chat_id, item, rating, review_text, created_at
```

### 2. Backend API Endpoints (NEW)

#### 2.1 Enhanced Restaurant List
```
GET /api/restaurants?search=<name>&cuisine=<type>&dietary=<tags>&sort=<field>&page=<num>
Response: { restaurants: [...], total: 42, page: 1, per_page: 20 }
```

#### 2.2 Restaurant Details
```
GET /api/restaurant/:id/details
Response: {
  restaurant: { id, name, cuisine_type, address, phone, hours, dietary_tags },
  menus: [{ id, menu_data }],
  stats: { avg_rating: 4.5, review_count: 24 },
  recent_reviews: [{ user_name, rating, review_text, created_at }]
}
```

#### 2.3 Restaurant Stats (Aggregate)
```
GET /api/restaurant/:id/stats
Response: { avg_rating: 4.5, review_count: 24, total_chats: 150 }
```

### 3. Frontend Changes

#### 3.1 New Components
```
src/components/
  RestaurantSearchBar.jsx     - Search input + filters (cuisine, dietary)
  RestaurantCard.jsx           - Enhanced card with rating, badges
  RestaurantDetailsDialog.jsx  - Modal showing full restaurant info
```

#### 3.2 Modified Screens
```
src/screens/DashboardScreen.js
  - Add <RestaurantSearchBar />
  - Use <RestaurantCard /> instead of inline cards
  - Add pagination controls
  - Add <RestaurantDetailsDialog /> on card click
```

#### 3.3 Updated Services
```
src/services/dataService.js
  + searchRestaurants(filters)
  + getRestaurantDetails(restaurantId)
  + getRestaurantStats(restaurantId)
```

### 4. Data Flow

```
User enters search -> RestaurantSearchBar
                    -> dataService.searchRestaurants({ search, cuisine, dietary, sort, page })
                    -> Backend: GET /api/restaurants?...
                    -> PostgreSQL query with filters
                    -> Response: { restaurants, total, page }
                    -> DashboardScreen updates state
                    -> Renders RestaurantCard[]

User clicks card -> Open RestaurantDetailsDialog
                 -> dataService.getRestaurantDetails(restaurantId)
                 -> Backend: GET /api/restaurant/:id/details
                 -> Response: { restaurant, menus, stats, recent_reviews }
                 -> Dialog displays info
                 -> User clicks "Start Chat" -> navigate to ChatScreen
```

---

## L - LOGIC / LAYOUT

### 1. Component Hierarchy

```
DashboardScreen
├── Header (Welcome, Role Badge) - EXISTING ✅
├── Settings Buttons - EXISTING ✅
├── RestaurantSearchBar - NEW ⚠️
│   ├── SearchInput (name)
│   ├── CuisineSelect (dropdown)
│   ├── DietaryChips (multi-select)
│   └── SortSelect (dropdown)
├── RestaurantGrid - MODIFIED ⚠️
│   └── RestaurantCard[] - NEW ⚠️
│       ├── Restaurant Avatar
│       ├── Name, Cuisine
│       ├── Rating Stars + Count
│       ├── Dietary Badges
│       └── Delete Button (if owner)
├── Pagination - NEW ⚠️
└── RestaurantDetailsDialog - NEW ⚠️
    ├── Restaurant Info
    ├── Menus Accordion
    ├── Recent Reviews
    └── "Start Chat" Button
```

### 2. State Management (DashboardScreen.js)

```javascript
const [searchFilters, setSearchFilters] = useState({
  search: '',
  cuisine: 'all',
  dietary: [],
  sort: 'name',
  page: 1
});
const [restaurants, setRestaurants] = useState([]);
const [totalRestaurants, setTotalRestaurants] = useState(0);
const [selectedRestaurant, setSelectedRestaurant] = useState(null); // For details dialog
const [restaurantDetails, setRestaurantDetails] = useState(null);
const [detailsLoading, setDetailsLoading] = useState(false);
```

### 3. Business Logic

#### Search/Filter Logic (Frontend)
```javascript
const handleSearchChange = (newFilters) => {
  setSearchFilters({ ...newFilters, page: 1 }); // Reset to page 1 on new search
  fetchRestaurants({ ...newFilters, page: 1 });
};

const fetchRestaurants = async (filters) => {
  setLoading(true);
  try {
    const result = await dataService.searchRestaurants(filters);
    setRestaurants(result.restaurants);
    setTotalRestaurants(result.total);
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    setLoading(false);
  }
};
```

#### Restaurant Details Logic
```javascript
const handleRestaurantClick = async (restaurantId) => {
  setSelectedRestaurant(restaurantId);
  setDetailsLoading(true);
  try {
    const details = await dataService.getRestaurantDetails(restaurantId);
    setRestaurantDetails(details);
  } catch (error) {
    console.error('Failed to load details:', error);
  } finally {
    setDetailsLoading(false);
  }
};
```

### 4. Backend Logic (Python)

#### Enhanced Restaurant Query
```python
# /api/restaurants endpoint (MODIFY)
@app.route('/api/restaurants', methods=['GET'])
@require_auth
def list_restaurants():
    user_id = g.user_id
    search = request.args.get('search', '')
    cuisine = request.args.get('cuisine', 'all')
    dietary = request.args.get('dietary', '')  # Comma-separated: "vegan,gluten-free"
    sort = request.args.get('sort', 'name')
    page = int(request.args.get('page', 1))
    per_page = 20

    # Build SQL query with filters
    query = "SELECT * FROM restaurants WHERE 1=1"
    params = []

    if search:
        query += " AND LOWER(name) LIKE %s"
        params.append(f"%{search.lower()}%")

    if cuisine != 'all':
        query += " AND cuisine_type = %s"
        params.append(cuisine)

    if dietary:
        dietary_tags = dietary.split(',')
        for tag in dietary_tags:
            query += " AND dietary_tags::jsonb @> %s"
            params.append(json.dumps([tag]))

    # Count total
    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    total = execute_query(count_query, params)[0]['count']

    # Sort and paginate
    if sort == 'rating':
        query += " ORDER BY (SELECT AVG(rating) FROM reviews WHERE restaurant_id = restaurants.id) DESC NULLS LAST"
    else:
        query += " ORDER BY name ASC"

    query += f" LIMIT {per_page} OFFSET {(page-1)*per_page}"
    restaurants = execute_query(query, params)

    # Enrich with stats
    for r in restaurants:
        stats = get_restaurant_stats(r['id'])
        r['avg_rating'] = stats['avg_rating']
        r['review_count'] = stats['review_count']

    return jsonify({
        'restaurants': restaurants,
        'total': total,
        'page': page,
        'per_page': per_page
    })
```

---

## P - PROCESS (Step-by-Step Implementation)

### PHASE 4.1: Backend - Database & API (2-3 days)

1. **Database Migration**
   - [ ] Write SQL migration: `migrations/004_restaurant_discovery.sql`
   - [ ] Add columns: cuisine_type, address, phone, hours, dietary_tags
   - [ ] Run migration on dev DB
   - [ ] Seed test data (10 restaurants with varied cuisines/dietary)

2. **Backend API - Enhanced Restaurant List**
   - [ ] Modify `/api/restaurants` to accept query params
   - [ ] Implement search filter (name)
   - [ ] Implement cuisine filter
   - [ ] Implement dietary tags filter (JSON contains)
   - [ ] Implement sorting (name, rating)
   - [ ] Add pagination (20 per page)
   - [ ] Test with curl/Postman

3. **Backend API - Restaurant Details**
   - [ ] Create `/api/restaurant/:id/details` endpoint
   - [ ] Join restaurants + menus + reviews
   - [ ] Calculate avg_rating, review_count (aggregate query)
   - [ ] Return recent 5 reviews with user names
   - [ ] Test with curl/Postman

4. **Backend API - Stats Endpoint**
   - [ ] Create `/api/restaurant/:id/stats` endpoint
   - [ ] Query reviews table for avg(rating), count(*)
   - [ ] Cache stats (optional, for performance)
   - [ ] Test with curl/Postman

### PHASE 4.2: Frontend - Components (2 days)

5. **RestaurantSearchBar Component**
   - [ ] Create `src/components/RestaurantSearchBar.jsx`
   - [ ] TextField for search (debounce 300ms)
   - [ ] Select for cuisine (hardcoded: Italian, Mexican, Chinese, American, Indian, Thai, Other)
   - [ ] Chips for dietary (vegan, vegetarian, gluten-free, halal, kosher, nut-free)
   - [ ] Select for sort (Name A-Z, Rating High-Low)
   - [ ] onFilterChange callback to parent

6. **RestaurantCard Component**
   - [ ] Create `src/components/RestaurantCard.jsx`
   - [ ] Accept props: restaurant, onSelect, onDelete, canDelete
   - [ ] Display: name, cuisine, rating (★★★★☆ 4.5), review count
   - [ ] Dietary badges (Chip components)
   - [ ] MUI Card with hover effect (existing pattern)

7. **RestaurantDetailsDialog Component**
   - [ ] Create `src/components/RestaurantDetailsDialog.jsx`
   - [ ] MUI Dialog (fullScreen on mobile)
   - [ ] Tabs: Overview, Menus, Reviews
   - [ ] Overview: cuisine, address, phone, hours, dietary tags
   - [ ] Menus: Accordion for each menu
   - [ ] Reviews: List of recent 5 reviews with stars
   - [ ] "Start Chat" button (navigate to /chat with restaurantId)

### PHASE 4.3: Frontend - Integration (1 day)

8. **Update dataService.js**
   - [ ] Add `searchRestaurants(filters)` function
   - [ ] Add `getRestaurantDetails(restaurantId)` function
   - [ ] Add `getRestaurantStats(restaurantId)` function
   - [ ] Use apiFetchJSON for JWT auth

9. **Update DashboardScreen.js**
   - [ ] Add searchFilters state
   - [ ] Replace listRestaurants() with searchRestaurants()
   - [ ] Add <RestaurantSearchBar onFilterChange={handleSearchChange} />
   - [ ] Replace inline cards with <RestaurantCard />
   - [ ] Add onClick handler to open <RestaurantDetailsDialog />
   - [ ] Add Pagination component (MUI Pagination)

### PHASE 4.4: Testing & Polish (1 day)

10. **Manual Testing**
    - [ ] Test search by name (partial match works)
    - [ ] Test cuisine filter (correct restaurants shown)
    - [ ] Test dietary filter (multi-select works)
    - [ ] Test sorting (name A-Z, rating high-low)
    - [ ] Test pagination (next/prev page)
    - [ ] Test restaurant details dialog (all tabs work)
    - [ ] Test "Start Chat" from details dialog
    - [ ] Test mobile responsive (search bar stacks vertically)

11. **Edge Cases**
    - [ ] No restaurants found (show empty state)
    - [ ] Restaurant has no reviews (show "No reviews yet")
    - [ ] Restaurant has no menus (show message)
    - [ ] Search with special characters (sanitized)
    - [ ] Long restaurant names (ellipsis)

12. **Performance**
    - [ ] Search debounce (300ms)
    - [ ] Backend query uses indexes (on name, cuisine_type)
    - [ ] Lazy load images (MUI Avatar handles this)

---

## H - HANDLING (Error Handling & Edge Cases)

### 1. Error Scenarios

#### 1.1 Backend Errors
- **Database connection failure**
  - Handling: Return 500 with generic error message
  - Frontend: Show "Failed to load restaurants. Please try again."
  - Logging: Log full error to backend logs

- **Invalid query params**
  - Handling: Return 400 with validation error
  - Frontend: Show error toast, reset to default filters

- **Restaurant not found (GET /api/restaurant/:id/details)**
  - Handling: Return 404
  - Frontend: Show "Restaurant not found" in dialog, close after 2s

#### 1.2 Frontend Errors
- **Network timeout**
  - Handling: Catch error, show retry button
  - UX: "Connection timed out. [Retry]"

- **Invalid search input**
  - Handling: Sanitize input (strip HTML, limit length to 100 chars)
  - Prevent XSS: Use DOMPurify or simple regex

- **Empty results**
  - Handling: Show empty state with suggestions
  - UX: "No restaurants found. Try adjusting your filters."

### 2. Edge Cases

#### 2.1 Data Quality Issues
- **Restaurant has no cuisine_type**
  - Display: "Cuisine: Not specified"
  - Filter: Exclude from cuisine filter results

- **Restaurant has no reviews**
  - Display: "No reviews yet" (no stars)
  - Sort by rating: Place at bottom

- **Restaurant has no dietary_tags**
  - Display: No badges shown
  - Filter: Excluded from dietary filter results

#### 2.2 User Behavior
- **Rapid filter changes**
  - Debounce search input (300ms)
  - Cancel previous API request (AbortController)

- **User clicks multiple restaurants quickly**
  - Disable cards while details loading (loading spinner)

- **User navigates away while loading**
  - Cancel pending requests on component unmount

### 3. Security Considerations

#### 3.1 Input Validation
- **Search input**: Max 100 chars, strip HTML tags
- **Cuisine select**: Validate against whitelist
- **Dietary tags**: Validate against whitelist
- **Page number**: Max 100, min 1

#### 3.2 Authorization
- **Restaurant deletion**: Only owner/admin can delete
  - Backend: Verify user_id matches restaurant.owner_id
  - Frontend: Hide delete button for non-owners

- **Restaurant details**: Public info only
  - Don't expose: owner_id, internal notes, financial data

---

## SUMMARY

### Files to Create (7)
1. `migrations/004_restaurant_discovery.sql` (DB migration)
2. `src/components/RestaurantSearchBar.jsx`
3. `src/components/RestaurantCard.jsx`
4. `src/components/RestaurantDetailsDialog.jsx`
5. Backend: `/api/restaurants` (modify existing)
6. Backend: `/api/restaurant/:id/details` (new endpoint)
7. Backend: `/api/restaurant/:id/stats` (new endpoint)

### Files to Modify (2)
1. `src/screens/DashboardScreen.js` (add search, use new components)
2. `src/services/dataService.js` (add 3 new functions)

### Database Changes
- ALTER TABLE restaurants: +5 columns (cuisine_type, address, phone, hours, dietary_tags)

### API Changes
- Modify: `GET /api/restaurants` (add filters, pagination)
- New: `GET /api/restaurant/:id/details`
- New: `GET /api/restaurant/:id/stats`

### Testing Checklist (12 items)
- See "PHASE 4.4: Testing & Polish" section

---

## APPROVAL REQUIRED

**Before proceeding, confirm:**
1. ✅ Is the scope correct? (search, filter, details view)
2. ✅ Should we add geolocation/distance? (NOT in this phase)
3. ✅ Should we add photos/images? (NOT in this phase - Phase 5)
4. ✅ Pagination size: 20 per page OK?
5. ✅ Cuisine types: Use hardcoded list or dynamic from DB?

**Ready to proceed?**
- Type "START PHASE 4.1" to begin with database migration
- Type "MODIFY PLAN" if you want changes
