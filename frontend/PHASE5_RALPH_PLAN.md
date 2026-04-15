# PHASE 5: SOCIAL & FAMILY DINING - RALPH PLAN

## PHASE STATUS
- **Current State**: Individual users browse menus with personal allergies
- **Target State**: Family accounts, social connections, @ mentions in chat, group safety checking
- **Priority**: CRITICAL - Flagship feature for families & social dining
- **Vision**: Unite people with food allergies through shared, safe dining experiences

---

## R - REQUIREMENTS

### 1. Core Vision

**"Make dining together safe, fun, and social for families and friends with allergies"**

This isn't just social networking - it's about **safety-first social dining**:
- Parents manage their children's allergy profiles
- @ mention friends in chat to check their allergies too
- See at-a-glance if a dish is safe for EVERYONE at the table
- Share discoveries, celebrate safe menu finds
- Build a supportive community around food allergies

### 2. Functional Requirements

#### 2.1 Family Accounts (CRITICAL)

**User Story**: "As a parent with 2 kids with peanut and dairy allergies, I want to manage their profiles and always see if menu items are safe for them."

- [ ] **Add Family Members**
  - Parent/guardian can add children to their account
  - Each family member has their own allergy profile
  - Family members can be: Child (under 13), Teen (13-17), Adult dependent
  - Required: Name, age, relationship, allergies
  - Optional: Photo, favorite foods, emergency contact

- [ ] **Family Mode Toggle**
  - Switch to enable "Family Mode" in chat
  - When ON: All family members' allergies are checked automatically
  - Visual indicator showing which family members are "dining with you"
  - Can select specific family members for each dining session

- [ ] **Family Dashboard**
  - View all family members at a glance
  - See each person's allergies and preferences
  - Edit family member profiles
  - Safety history: track what each person has eaten safely

#### 2.2 Social Connections (HIGH PRIORITY)

**User Story**: "As someone with celiac disease, I want to follow my friends and see what gluten-free options they've discovered."

- [ ] **Follow System**
  - Send/accept follow requests
  - View followers and following lists
  - Privacy: Control who can see your activity
  - Suggested connections: Friends with similar allergies

- [ ] **@ Mentions in Chat**
  - Type @ in chat to see list of people you follow
  - Tag friends/family: "@Sarah can you eat this too?"
  - AI automatically checks tagged person's allergies
  - Response highlights: "✅ Safe for Sarah (gluten-free)" or "⚠️ Contains dairy - Sarah can't eat this"

- [ ] **Group Dining Mode**
  - Create a "dining group" for the current session
  - Add people via @ mentions or family members
  - AI checks ALL group members' allergies
  - Visual safety indicator: "Safe for 4/5 people" with breakdown
  - Can see who specifically can't eat each dish

#### 2.3 Activity Feed & Social Discovery

**User Story**: "I want to see what safe options my friends have found at restaurants I'm planning to visit."

- [ ] **Activity Feed**
  - See friends' restaurant visits
  - Safe menu item discoveries: "Alex found 5 vegan options at Bella Vita!"
  - Photo sharing of safe dishes
  - Reactions: 👍 helpful, ❤️ love it, 🎉 must try
  - Comments: "Is the gluten-free pizza good?"

- [ ] **Shared Favorites**
  - Save favorite dishes
  - See friends' favorites at each restaurant
  - "3 friends recommend the dairy-free pasta"
  - Filter restaurants by "friends' recommendations"

- [ ] **Safety Stories**
  - Post success stories: "First time finding nut-free Thai food!"
  - Share warnings: "Double-check ingredients - coconut in 'nut-free' section"
  - Community support and celebration

#### 2.4 Achievement System (FUN)

**Focus**: Celebrate exploration and safety, not just usage

- [ ] **Safety Achievements**
  - "Safety First" - 10 chats checking allergies
  - "Family Guardian" - Add first family member
  - "Group Helper" - @ mention 5 friends
  - "Explorer" - Try 10 different restaurants
  - "Allergy Ally" - Help 3 friends find safe options

- [ ] **Discovery Badges**
  - "Vegan Voyager" - Find 20 vegan dishes
  - "Gluten-Free Guru" - Discover 15 GF options
  - "Nut-Free Navigator" - Map 10 nut-free menus
  - "Dairy Dodger" - Avoid dairy at 5 restaurants

- [ ] **Community Impact**
  - "Helpful" - 10 people saved your recommendation
  - "Trusted" - 50 upvotes on your reviews
  - "Connector" - Introduce 5 friends to the app

#### 2.5 Profile System

- [ ] **Public Profile**
  - Display name, photo, bio
  - Dietary identity: "Parent of 2 with nut allergies"
  - Privacy controls: Public, Friends only, Private
  - Show achievements (optional)

- [ ] **Allergy Visibility**
  - Choose which allergies to share publicly
  - Always visible to people you @ mention
  - Family members can see each other's full profiles

---

## A - ARCHITECTURE

### 1. Database Schema Changes

#### 1.1 New Tables

**family_members**
```sql
CREATE TABLE family_members (
    id SERIAL PRIMARY KEY,
    parent_user_id INTEGER REFERENCES users(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    relationship VARCHAR(50), -- 'child', 'teen', 'adult_dependent'
    photo_url TEXT,
    emergency_contact TEXT, -- JSON: {name, phone}
    favorite_foods TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT NOW()
);
```

**family_member_allergies**
```sql
CREATE TABLE family_member_allergies (
    id SERIAL PRIMARY KEY,
    family_member_id INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
    ingredient VARCHAR(255) NOT NULL,
    restriction_type VARCHAR(50) DEFAULT 'Allergy', -- 'Allergy', 'Preference'
    severity VARCHAR(20) DEFAULT 'High', -- 'High', 'Medium', 'Low'
    notes TEXT
);
```

**social_connections**
```sql
CREATE TABLE social_connections (
    id SERIAL PRIMARY KEY,
    follower_user_id INTEGER REFERENCES users(id) NOT NULL,
    following_user_id INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_user_id, following_user_id)
);
```

**dining_groups**
```sql
CREATE TABLE dining_groups (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) NOT NULL,
    creator_user_id INTEGER REFERENCES users(id) NOT NULL,
    name VARCHAR(100), -- Optional: "Family dinner", "Girls night"
    created_at TIMESTAMP DEFAULT NOW()
);
```

**dining_group_members**
```sql
CREATE TABLE dining_group_members (
    id SERIAL PRIMARY KEY,
    dining_group_id INTEGER REFERENCES dining_groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id), -- For social connections
    family_member_id INTEGER REFERENCES family_members(id), -- For family
    added_at TIMESTAMP DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR family_member_id IS NOT NULL)
);
```

**activity_feed**
```sql
CREATE TABLE activity_feed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'restaurant_visit', 'safe_dish_found', 'review', 'achievement'
    restaurant_id INTEGER REFERENCES restaurants(id),
    chat_id INTEGER REFERENCES chats(id),
    content JSON, -- Flexible data: {dish_name, photo_url, tags, etc.}
    privacy VARCHAR(20) DEFAULT 'friends', -- 'public', 'friends', 'private'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_user_time ON activity_feed(user_id, created_at DESC);
```

**activity_reactions**
```sql
CREATE TABLE activity_reactions (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    reaction_type VARCHAR(20) NOT NULL, -- 'helpful', 'love', 'celebrate'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);
```

**achievements**
```sql
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL, -- 'safety_first', 'family_guardian'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Emoji or icon name
    category VARCHAR(50), -- 'safety', 'exploration', 'social'
    requirement JSON -- {type: 'count', target: 10}
);
```

**user_achievements**
```sql
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    achievement_id INTEGER REFERENCES achievements(id) NOT NULL,
    progress INTEGER DEFAULT 0,
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);
```

#### 1.2 Modified Tables

**users** (add columns)
```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN photo_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN privacy_level VARCHAR(20) DEFAULT 'friends'; -- 'public', 'friends', 'private'
ALTER TABLE users ADD COLUMN show_allergies BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN show_achievements BOOLEAN DEFAULT TRUE;
```

**chats** (add columns)
```sql
ALTER TABLE chats ADD COLUMN dining_group_id INTEGER REFERENCES dining_groups(id);
ALTER TABLE chats ADD COLUMN family_mode BOOLEAN DEFAULT FALSE;
```

### 2. Backend API Endpoints (NEW)

#### 2.1 Family Management

```
POST   /api/family/members                  # Add family member
GET    /api/family/members                  # List all family members
GET    /api/family/members/:id              # Get family member details
PATCH  /api/family/members/:id              # Update family member
DELETE /api/family/members/:id              # Remove family member
POST   /api/family/members/:id/allergies    # Add allergy to family member
DELETE /api/family/allergies/:id            # Remove allergy
```

#### 2.2 Social Connections

```
POST   /api/social/follow/:user_id          # Send follow request
DELETE /api/social/follow/:user_id          # Unfollow
POST   /api/social/accept/:user_id          # Accept follow request
GET    /api/social/followers                # Get followers list
GET    /api/social/following                # Get following list
GET    /api/social/suggestions              # Suggested connections
GET    /api/social/search?q=name            # Search users
```

#### 2.3 Dining Groups

```
POST   /api/dining-groups                   # Create dining group for chat
POST   /api/dining-groups/:id/members       # Add member to group
DELETE /api/dining-groups/:id/members/:mid  # Remove member
GET    /api/dining-groups/:id               # Get group details
GET    /api/dining-groups/:id/allergies     # Get combined allergies for group
```

#### 2.4 Activity Feed

```
GET    /api/feed                            # Get personalized feed
POST   /api/feed/activity                   # Post activity
POST   /api/feed/:id/react                  # React to activity
GET    /api/feed/:id/reactions              # Get reactions for activity
POST   /api/feed/:id/comment                # Comment on activity
```

#### 2.5 Achievements

```
GET    /api/achievements                    # List all achievements
GET    /api/achievements/user               # Get user's achievements
POST   /api/achievements/progress           # Update achievement progress
```

#### 2.6 Enhanced Chat (MODIFY EXISTING)

```
POST   /api/chat/mention                    # @ mention user in chat
GET    /api/chat/:id/safety-check           # Check dish safety for group
POST   /api/chat/family-mode                # Toggle family mode
```

### 3. Frontend Architecture

#### 3.1 New Screens

```
src/screens/
  SocialScreen.js              # Main social hub (feed, connections)
  FamilyManagementScreen.js    # Manage family members
  AddFamilyMemberScreen.js     # Add new family member
  ProfileScreen.js             # User profile (own + others)
  EditProfileScreen.js         # Edit own profile (already exists, enhance)
  AchievementsScreen.js        # View achievements
  FollowersScreen.js           # View followers/following
```

#### 3.2 New Components

```
src/components/
  FamilyMemberCard.jsx         # Display family member with allergies
  FamilyModeToggle.jsx         # Switch for family mode in chat
  DiningGroupPanel.jsx         # Show active dining group members
  MentionAutocomplete.jsx      # @ mention dropdown in chat
  SafetyIndicator.jsx          # Visual: "Safe for 4/5 people"
  ActivityFeedCard.jsx         # Activity feed item
  AchievementBadge.jsx         # Achievement display
  ConnectionCard.jsx           # Follow/follower card
  SafetyBreakdown.jsx          # Who can/can't eat this dish
```

#### 3.3 Enhanced Components

```
ChatScreen.js                  # Add @ mention, dining group, family mode
DashboardScreen.js             # Add social feed preview, achievements widget
MenuScreen.js                  # Show group safety indicators
```

---

## L - LOGIC / LAYOUT

### 1. User Flows

#### Flow 1: Parent Adds Child

```
DashboardScreen
  → Click "Manage Family" button
  → FamilyManagementScreen
    → Click "Add Family Member"
    → AddFamilyMemberScreen
      → Enter: Name, Age, Relationship
      → Add allergies (multi-select)
      → Upload photo (optional)
      → Add emergency contact (optional)
      → Click "Save"
    → Returns to FamilyManagementScreen
    → See new family member card
    → Achievement unlocked: "Family Guardian" 🎉
```

#### Flow 2: @ Mention Friend in Chat

```
ChatScreen (at restaurant)
  → User typing: "The gluten-free pasta looks good. @Sarah can you eat this?"
  → As user types "@", MentionAutocomplete appears
  → Shows: Family members + Following list
  → User selects "Sarah Miller"
  → AI processes message:
    1. Analyzes "gluten-free pasta"
    2. Checks Sarah's allergies (dairy, eggs)
    3. Checks pasta ingredients
  → AI responds: "✅ The gluten-free pasta is safe for Sarah too!
                  No dairy or eggs detected. However, be sure to ask
                  about butter in the sauce."
  → Sarah receives notification: "Alex mentioned you in a chat at Bella Vita"
  → Activity created: "Alex is dining with Sarah at Bella Vita"
```

#### Flow 3: Family Mode Dining

```
ChatScreen
  → Parent enables "Family Mode" toggle
  → DiningGroupPanel appears showing:
    - Mom (gluten-free)
    - Dad (no restrictions)
    - Emma, 8 (peanut, tree nut allergy)
    - Jake, 5 (dairy allergy)
  → User asks: "What pizza can we ALL share?"
  → AI checks menu against ALL 4 profiles
  → AI responds with safety breakdown:
    "🍕 Margherita Pizza (Modified):
    ✅ Safe for: Mom, Dad, Emma
    ⚠️ Not safe for Jake (contains mozzarella cheese - dairy)

    🍕 Vegan Pizza:
    ✅ Safe for EVERYONE! ✨
    Dairy-free cheese, gluten-free crust available, nut-free"
```

#### Flow 4: Social Discovery

```
SocialScreen → Feed Tab
  → User scrolls feed
  → Sees activity: "Sarah found 3 vegan options at Thai Spice!"
  → User clicks activity
  → Opens restaurant details + Sarah's safe dishes
  → User clicks 👍 "Helpful" reaction
  → User comments: "Thanks! Planning to go this weekend!"
  → Sarah receives notification: "Alex reacted to your discovery"
  → User saves restaurant to favorites
  → Achievement progress: "Explorer" (7/10 restaurants)
```

### 2. Component Hierarchy

#### Enhanced ChatScreen

```
ChatScreen
├── Header
│   ├── Restaurant name
│   └── FamilyModeToggle
├── DiningGroupPanel (if active)
│   ├── GroupMemberChip[] (avatars + names)
│   └── "Add more" button
├── SafetyIndicator (if group mode)
│   ├── "Safe for X/Y people"
│   └── Expandable SafetyBreakdown
├── MessageList
│   ├── Message (user)
│   ├── Message (AI) with @ mentions highlighted
│   └── SafetyBreakdown (when relevant)
└── InputBox
    ├── TextField with MentionAutocomplete
    └── Send button
```

#### FamilyManagementScreen

```
FamilyManagementScreen
├── Header ("My Family")
├── FamilyModeInfo (explanation card)
├── AddFamilyMemberButton
├── FamilyMemberCard[]
│   ├── Photo + Name + Age
│   ├── Allergies chips
│   ├── Edit button
│   └── Delete button (with confirmation)
└── EmptyState (if no family members)
```

#### SocialScreen (New Main Hub)

```
SocialScreen
├── Tabs
│   ├── Feed
│   ├── Connections
│   └── Achievements
├── TabPanel: Feed
│   ├── CreateActivityCard (post update)
│   └── ActivityFeedCard[]
│       ├── User avatar + name
│       ├── Activity content
│       ├── Photo (if any)
│       ├── Reactions (👍 ❤️ 🎉)
│       └── Comments
├── TabPanel: Connections
│   ├── Search bar
│   ├── Suggested connections
│   ├── Following list
│   └── Followers list
└── TabPanel: Achievements
    ├── Progress overview
    └── AchievementBadge[] (unlocked + locked)
```

### 3. Business Logic

#### @ Mention Safety Check (AI Chat Enhancement)

```python
def handle_mention_in_chat(chat_id, message, mentioned_user_ids):
    """
    When user @ mentions someone, check their allergies too
    """
    # Get dining group for this chat (or create one)
    dining_group = get_or_create_dining_group(chat_id)

    # Add mentioned users to dining group
    for user_id in mentioned_user_ids:
        add_to_dining_group(dining_group.id, user_id)

    # Get combined allergies
    all_allergies = get_dining_group_allergies(dining_group.id)

    # Include in AI context
    context = f"""
    DINING GROUP ALLERGIES:
    {format_allergies_for_ai(all_allergies)}

    When recommending dishes, ALWAYS check against ALL group members' allergies.
    Use this format for safety breakdown:
    ✅ Safe for: [names]
    ⚠️ Not safe for: [names] - [reason]
    """

    # Process chat with enhanced context
    ai_response = process_chat_with_context(message, context, menu)

    # Create activity
    create_activity(
        user_id=current_user_id,
        type='dining_with_friend',
        content={
            'restaurant_id': chat.restaurant_id,
            'mentioned_users': mentioned_user_ids
        }
    )

    # Notify mentioned users
    for user_id in mentioned_user_ids:
        send_notification(user_id, 'mention', chat_id)

    return ai_response
```

#### Family Mode Logic

```python
def enable_family_mode(chat_id, family_member_ids):
    """
    Enable family mode: check all family members' allergies
    """
    # Create dining group
    dining_group = create_dining_group(chat_id, name="Family")

    # Add all selected family members
    for member_id in family_member_ids:
        add_family_member_to_group(dining_group.id, member_id)

    # Get combined allergies
    family_allergies = []
    for member_id in family_member_ids:
        member = get_family_member(member_id)
        allergies = get_family_member_allergies(member_id)
        family_allergies.append({
            'name': member.name,
            'allergies': allergies
        })

    # Update chat context
    update_chat_context(chat_id, {
        'family_mode': True,
        'dining_group_id': dining_group.id,
        'family_allergies': family_allergies
    })

    # Achievement progress
    update_achievement_progress(
        user_id=current_user_id,
        achievement_key='family_guardian',
        increment=1
    )

    return dining_group
```

---

## P - PROCESS (Step-by-Step Implementation)

### PHASE 5.1: Foundation - Database & Family Profiles (3 days)

1. **Database Migration**
   - [ ] Create migration: `005_social_family.sql`
   - [ ] Add tables: family_members, family_member_allergies
   - [ ] Add columns to users: display_name, photo_url, bio, privacy_level
   - [ ] Add columns to chats: dining_group_id, family_mode
   - [ ] Run migration, verify schema
   - [ ] Seed test data (3 families with different allergies)

2. **Backend: Family Management APIs**
   - [ ] POST /api/family/members - Add family member
   - [ ] GET /api/family/members - List family members
   - [ ] PATCH /api/family/members/:id - Update member
   - [ ] DELETE /api/family/members/:id - Delete member
   - [ ] POST /api/family/members/:id/allergies - Add allergy
   - [ ] Test with curl/Postman

3. **Frontend: Family Management UI**
   - [ ] Create FamilyManagementScreen.js
   - [ ] Create AddFamilyMemberScreen.js
   - [ ] Create FamilyMemberCard.jsx component
   - [ ] Add "Manage Family" button to DashboardScreen
   - [ ] Test: Add/edit/delete family members
   - [ ] Add allergy management for family members

### PHASE 5.2: Family Mode in Chat (2 days)

4. **Backend: Family Mode Logic**
   - [ ] Create dining_groups, dining_group_members tables
   - [ ] POST /api/dining-groups - Create group
   - [ ] POST /api/dining-groups/:id/members - Add member
   - [ ] GET /api/dining-groups/:id/allergies - Combined allergies
   - [ ] Modify chat AI: Include family allergies in context

5. **Frontend: Family Mode UI**
   - [ ] Create FamilyModeToggle.jsx component
   - [ ] Create DiningGroupPanel.jsx component
   - [ ] Create SafetyIndicator.jsx component
   - [ ] Add to ChatScreen: Family mode toggle
   - [ ] Add to ChatScreen: Show active dining group
   - [ ] Test: Enable family mode, ask AI about dishes
   - [ ] Verify: AI checks all family members' allergies

### PHASE 5.3: Social Connections (2 days)

6. **Backend: Social APIs**
   - [ ] Create social_connections table
   - [ ] POST /api/social/follow/:user_id - Follow
   - [ ] DELETE /api/social/follow/:user_id - Unfollow
   - [ ] GET /api/social/followers - List
   - [ ] GET /api/social/following - List
   - [ ] GET /api/social/search - Search users
   - [ ] Test with curl

7. **Frontend: Connections UI**
   - [ ] Create SocialScreen.js with tabs
   - [ ] Create ConnectionCard.jsx component
   - [ ] Add search functionality
   - [ ] Add follow/unfollow buttons
   - [ ] Show followers/following lists
   - [ ] Add "Social" to main navigation

### PHASE 5.4: @ Mentions in Chat (3 days)

8. **Backend: @ Mention System**
   - [ ] Parse @ mentions from chat messages
   - [ ] GET /api/social/mentionable - Get users you can mention
   - [ ] POST /api/chat/mention - Process mention
   - [ ] Add mentioned users to dining group automatically
   - [ ] Enhanced AI: Include mentioned users' allergies
   - [ ] Create notification when mentioned

9. **Frontend: @ Mention UI**
   - [ ] Create MentionAutocomplete.jsx component
   - [ ] Integrate into ChatScreen input
   - [ ] Trigger on "@" character
   - [ ] Show family + following list
   - [ ] Highlight mentions in messages
   - [ ] Create SafetyBreakdown.jsx for group responses
   - [ ] Test: @ mention friend, verify allergy check

### PHASE 5.5: Activity Feed (2 days)

10. **Backend: Activity Feed**
    - [ ] Create activity_feed, activity_reactions tables
    - [ ] GET /api/feed - Personalized feed
    - [ ] POST /api/feed/activity - Create activity
    - [ ] POST /api/feed/:id/react - React to activity
    - [ ] Auto-create activities: restaurant visit, @ mention, safe dish found
    - [ ] Privacy filtering

11. **Frontend: Feed UI**
    - [ ] Create ActivityFeedCard.jsx component
    - [ ] Add Feed tab to SocialScreen
    - [ ] Show personalized feed
    - [ ] Add reaction buttons (👍 ❤️ 🎉)
    - [ ] Test: Activities appear, reactions work

### PHASE 5.6: Achievements (1 day)

12. **Backend: Achievements**
    - [ ] Create achievements, user_achievements tables
    - [ ] Seed initial achievements (10-15)
    - [ ] POST /api/achievements/progress - Update progress
    - [ ] Achievement trigger system
    - [ ] GET /api/achievements/user - User's achievements

13. **Frontend: Achievements UI**
    - [ ] Create AchievementBadge.jsx component
    - [ ] Create AchievementsScreen.js
    - [ ] Add Achievements tab to SocialScreen
    - [ ] Show unlocked + locked achievements
    - [ ] Progress bars for in-progress achievements
    - [ ] Toast notification when unlocked

### PHASE 5.7: Polish & Testing (2 days)

14. **Integration Testing**
    - [ ] Test full family flow: Add child, enable family mode, chat
    - [ ] Test @ mention flow: Follow friend, mention in chat, check allergies
    - [ ] Test group dining: Multiple people, safety breakdown
    - [ ] Test activity feed: Post activity, react, see in feed
    - [ ] Test achievements: Trigger, progress, unlock

15. **UX Polish**
    - [ ] Add loading states everywhere
    - [ ] Error handling for all APIs
    - [ ] Empty states for lists
    - [ ] Onboarding tooltips
    - [ ] Mobile responsive check
    - [ ] Performance optimization

---

## H - HANDLING (Safety & Edge Cases)

### 1. Safety-Critical Features

#### Family Member Allergies
- **CRITICAL**: Never hide or ignore child allergies
- **Verification**: Require parent confirmation for allergy changes
- **Emergency**: Display emergency contact in chat if severe reaction risk
- **Override**: Parent can manually override AI suggestion (with warning)

#### @ Mention Allergy Checking
- **Accuracy**: If allergy info unclear, err on side of caution (mark unsafe)
- **Visibility**: Clearly show whose allergies were checked
- **Staleness**: Warn if mentioned person's allergies last updated >6 months ago
- **Privacy**: Don't reveal specific allergies to non-connected users

#### Group Dining Safety
- **Transparency**: Always show full breakdown of who can/can't eat
- **Highlighting**: Visual distinction between "safe for all" vs "safe for some"
- **Cross-contamination**: AI should warn about shared cooking surfaces
- **Ask server**: Encourage users to verify with restaurant staff

### 2. Privacy & Security

#### Family Member Data
- **Access Control**: Only parent can view/edit family member profiles
- **Deletion**: Cascade delete allergies when family member removed
- **Age Verification**: Don't allow minors to create accounts (must be added by parent)
- **Photo Privacy**: Family member photos never public (only visible to parent)

#### Social Connections
- **Privacy Settings**: Users can be: Public, Friends-only, Private
- **Blocking**: Ability to block users (prevents follow, mention, feed)
- **Reporting**: Report inappropriate activity content
- **Data Sharing**: Control what activity is visible to whom

#### @ Mentions
- **Consent**: Can only @ mention people who follow you back (mutual)
- **Notifications**: Opt-out of mention notifications
- **Spam Prevention**: Rate limit mentions (max 5 new people per chat)

### 3. Edge Cases

#### Scenario: Child has severe allergy, parent @ mentions friend who doesn't
- **Handling**: AI responds with clear breakdown
- **Example**: "✅ Safe for Alex (your friend). ⚠️ WARNING: Contains peanuts - Emma cannot eat this. Severe allergy risk."

#### Scenario: User @ mentions someone who hasn't updated allergies in 2 years
- **Handling**: Show warning
- **Message**: "⚠️ Sarah's allergy profile was last updated 2 years ago. Please ask her to confirm her current allergies."

#### Scenario: Dining group has conflicting restrictions (vegan + pescatarian)
- **Handling**: AI finds overlap or suggests alternatives
- **Example**: "The group has both vegan and pescatarian members. Here are options:
  - Vegan pasta (safe for both)
  - Grilled salmon (safe for pescatarian only, contains fish)"

#### Scenario: Parent removes child from family account
- **Handling**: Soft delete (archive) instead of hard delete
- **Reason**: Preserve safety history
- **Data**: Mark as "inactive" but keep allergy records

---

## SUCCESS METRICS

### Engagement Metrics
- [ ] 60% of parents add at least 1 family member within first week
- [ ] 40% of users enable family mode in at least 1 chat
- [ ] 30% of users @ mention someone within first month
- [ ] 50% of users follow at least 3 connections
- [ ] 70% of users unlock at least 1 achievement

### Safety Metrics
- [ ] 0 incidents of missed allergies in family mode
- [ ] 95% accuracy in @ mention allergy checking
- [ ] 100% of severe allergies flagged in group safety checks

### Social Metrics
- [ ] 25% of chats involve @ mentions
- [ ] 40% of users view activity feed weekly
- [ ] 20% of users post at least 1 activity per month
- [ ] 15% of users react to friends' activities

### Retention Impact
- [ ] +30% retention for users who add family members
- [ ] +50% retention for users with 3+ connections
- [ ] +20% retention for users who unlock achievements

---

## SUMMARY

### New Features (8)
1. ✅ Family member management
2. ✅ Family mode in chat (auto-check kids' allergies)
3. ✅ Social connections (follow friends)
4. ✅ @ mentions with allergy checking
5. ✅ Group dining mode (safety for everyone)
6. ✅ Activity feed (social discovery)
7. ✅ Achievements (gamification)
8. ✅ Enhanced profiles (photos, bios)

### Database Changes
- **8 new tables**: family_members, family_member_allergies, social_connections, dining_groups, dining_group_members, activity_feed, activity_reactions, achievements, user_achievements
- **Modified tables**: users (+4 columns), chats (+2 columns)

### API Endpoints
- **Family**: 6 endpoints
- **Social**: 6 endpoints
- **Dining Groups**: 4 endpoints
- **Activity Feed**: 4 endpoints
- **Achievements**: 3 endpoints
- **Total**: 23 new endpoints

### Frontend Components
- **7 new screens**
- **10 new components**
- **3 enhanced screens**

### Timeline
- **Total**: 15 days (3 weeks)
- **Phase 5.1-5.2**: 5 days (Family features)
- **Phase 5.3-5.4**: 5 days (Social features)
- **Phase 5.5-5.7**: 5 days (Feed, achievements, polish)

---

## NEXT: Ready to Begin Phase 5.1?

This plan creates the **flagship family & social feature** for Chat with Menu:
- ✅ Safety-first design
- ✅ Family-oriented (parents + kids)
- ✅ Social dining (@ mentions, groups)
- ✅ Fun and useful (achievements, feed)
- ✅ Seamless integration with existing chat

**Ready to start?** Say "START PHASE 5.1" to begin with database and family profiles.
