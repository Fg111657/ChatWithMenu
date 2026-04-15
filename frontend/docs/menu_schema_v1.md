# Menu Schema v2

This document defines the JSON schema for `MenuDetail.menu_data`, the single source of truth for all menu data in Chat With Menu.

## Overview

All menu data is stored as a JSON string in `MenuDetail.menu_data`. Both **MenuManager** (read/write) and **ServerDashboard** (read-only) consume this same data structure.

## Canonical Hierarchy

```
Restaurant
 └── Menu (meal period: Lunch / Dinner / Brunch / Drinks)
      └── Category (Appetizers / Mains / Desserts / Beverages)
           └── Menu Item
```

## Schema Definition

```json
{
  "version": 2,
  "currency": "USD",
  "language": "en",
  "updated_at": "2026-01-13T12:00:00Z",
  "raw_input": "Original text menu (audit only, never rendered)",
  "menus": [...],
  "specials": [...],
  "upsell_tips": [...]
}
```

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | integer | Yes | Schema version (currently 2) |
| `currency` | string | Yes | ISO 4217 currency code (default: "USD") |
| `language` | string | Yes | ISO 639-1 language code (default: "en") |
| `updated_at` | string | Yes | ISO 8601 timestamp of last update |
| `raw_input` | string | No | Original unstructured text (audit trail only) |
| `menus` | array | Yes | Meal period menus (Lunch, Dinner, Brunch, Drinks) |
| `specials` | array | Yes | Daily/weekly specials |
| `upsell_tips` | array | Yes | Server upsell suggestions |

### Language Handling

The `language` field stores the primary language of the menu (ISO 639-1 code):
- `en` - English (default)
- `es` - Spanish
- `fr` - French
- `it` - Italian
- `zh` - Chinese
- etc.

**Behavior:**
1. Menu text is stored in original language (no translation on save)
2. If user's language differs from menu language, chat can translate responses
3. Original text is always preserved for accuracy

---

## Menus (Meal Periods)

Each menu represents a meal period (Lunch, Dinner, Brunch, Drinks).

```json
{
  "id": "uuid-string",
  "name": "Dinner",
  "meal_period": "dinner",
  "display_order": 1,
  "categories": [...]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the menu |
| `name` | string | Yes | Display name (e.g., "Dinner", "Lunch") |
| `meal_period` | string | Yes | Lowercase identifier: `lunch`, `dinner`, `brunch`, `drinks` |
| `display_order` | integer | Yes | Sort order (1-based) |
| `categories` | array | Yes | Menu categories |

**Note:** For V1 compatibility, restaurants with single menus will default to `meal_period: "dinner"`.

---

## Categories

Each category groups related menu items (e.g., "Appetizers", "Mains", "Desserts").

```json
{
  "id": "uuid-string",
  "name": "Appetizers",
  "display_order": 1,
  "items": [...]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the category |
| `name` | string | Yes | Display name |
| `display_order` | integer | Yes | Sort order (1-based) |
| `items` | array | Yes | Menu items in this category |

---

## Menu Items

```json
{
  "id": "uuid-string",
  "name": "Caesar Salad",
  "description": "Romaine lettuce, parmesan, croutons, house-made dressing",
  "price": 13.00,
  "allergens": ["dairy", "gluten", "eggs"],
  "dietary_tags": ["vegetarian"],
  "modifiers": [...],
  "available": true,
  "needs_review": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the item |
| `name` | string | Yes | Dish name |
| `description` | string | No | Ingredients/description (used for allergy detection) |
| `price` | number | Yes | **Base price** of the dish |
| `allergens` | array | No | List of allergens (lowercase): `gluten`, `dairy`, `nuts`, `eggs`, `soy`, `fish`, `shellfish`, `sesame` |
| `dietary_tags` | array | No | Dietary labels: `vegetarian`, `vegan`, `pescatarian`, `gluten-free`, `dairy-free`, `keto`, `halal`, `kosher` |
| `modifiers` | array | No | Add-ons/upgrades with pricing |
| `available` | boolean | Yes | Whether item is currently available |
| `needs_review` | boolean | No | Flag for low-confidence parsed items |

---

## Modifiers (Add-ons / Upgrades)

Modifiers represent upgrades or additions to a base dish. **The price field represents the extra cost, not the total.**

```json
{
  "id": "uuid-string",
  "name": "with chicken",
  "price": 14.00
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the modifier |
| `name` | string | Yes | Modifier name (e.g., "with chicken", "extra cheese") |
| `price` | number | Yes | **Additional cost** (not total price) |

### Modifier Pricing Convention

When parsing menu text like:
```
Caesar salad 13 | with chicken or shrimp 27
```

The parser should:
1. Set `item.price = 13` (base price)
2. Calculate modifier price: `27 - 13 = 14`
3. Create modifiers with `price: 14` (the extra cost)

**Display format:** `+$14.00` (prefix with plus sign)

### Common Modifier Patterns

| Input Pattern | Parsed Result |
|---------------|---------------|
| `Caesar salad 13 \| with chicken 27` | base: $13, modifier: +$14 |
| `Pasta 18 - gluten free extra $2` | base: $18, modifier: +$2 |
| `Steak 35 \| add lobster tail 25` | base: $35, modifier: +$25 |

---

## Specials

Daily or weekly specials that may or may not be on the regular menu.

```json
{
  "id": "uuid-string",
  "dish_id": "uuid-or-null",
  "name": "Lobster Bisque",
  "description": "Chef's special soup of the day",
  "price": 14.99,
  "available_days": ["friday", "saturday"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the special |
| `dish_id` | string | No | Optional reference to existing menu item |
| `name` | string | Yes | Special name |
| `description` | string | No | Description |
| `price` | number | No | Price (may differ from linked dish) |
| `available_days` | array | No | Days available (lowercase): `monday`, `tuesday`, etc. Empty = always available |

### Special Types

1. **Linked Special**: References existing menu item (`dish_id` set)
   - Can override price for special pricing
   - Inherits allergens/tags from linked item

2. **Custom Special**: Not on regular menu (`dish_id` null)
   - Requires manual entry of all fields
   - Used for chef's specials, seasonal items

---

## Upsell Tips

Server-facing suggestions to increase average check.

```json
{
  "id": "uuid-string",
  "title": "Wine Pairings",
  "body": "Suggest a wine pairing - increases avg check by 20%",
  "enabled": true,
  "display_order": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | UUID for the tip |
| `title` | string | Yes | Short title |
| `body` | string | Yes | Full tip text |
| `enabled` | boolean | Yes | Whether to show in ServerDashboard |
| `display_order` | integer | Yes | Sort order |

---

## Parsing Exclusion Rules

When parsing legacy text menus, the following patterns should be **excluded** (not created as menu items):

### Category Headers
- Single words under 15 characters without prices: `contorni`, `DESSERT`, `Appetizers`
- All-caps category names

### Meta/Format Lines
```regex
^(glass|bottle|single|double|small|medium|large|half|full)\s*[|/]
```
Examples to exclude:
- `glass | bottle`
- `single/double`
- `small | medium | large`

### Disclaimers & Notes
```regex
^(gf|v|vg|vegan|vegetarian|\*+|contains|may contain|allergen|please ask|disclaimer)
```

### Price-Only Lines
Lines with only prices and no dish name:
- `14 | 50`
- `$12.99`

### Short Ambiguous Lines
- Lines under 20 characters without a clear price pattern
- Description fragments that belong to previous item

---

## Low-Confidence Parsing (`needs_review`)

Items flagged with `needs_review: true` when:

1. **Name too short** (< 3 characters)
2. **Name looks like a category header** (single word, no price context)
3. **Price seems wrong** ($0 or > $500)
4. **Multiple prices detected** (couldn't determine base vs modifier)
5. **Description attached to wrong item** (heuristic mismatch)

The MenuManager should surface these items for manual review.

---

## Example Complete Menu

```json
{
  "version": 2,
  "currency": "USD",
  "updated_at": "2026-01-13T12:00:00Z",
  "raw_input": "Original menu text...",
  "menus": [
    {
      "id": "menu-dinner",
      "name": "Dinner",
      "meal_period": "dinner",
      "display_order": 1,
      "categories": [
        {
          "id": "cat-salads",
          "name": "Salads",
          "display_order": 1,
          "items": [
            {
              "id": "item-caesar",
              "name": "Caesar Salad",
              "description": "Romaine lettuce, parmesan, croutons, house-made dressing",
              "price": 13.00,
              "allergens": ["dairy", "gluten", "eggs"],
              "dietary_tags": ["vegetarian"],
              "modifiers": [
                {"id": "mod-chicken", "name": "with chicken", "price": 14.00},
                {"id": "mod-shrimp", "name": "with shrimp", "price": 14.00}
              ],
              "available": true,
              "needs_review": false
            }
          ]
        }
      ]
    }
  ],
  "specials": [
    {
      "id": "special-lobster",
      "dish_id": null,
      "name": "Lobster Bisque",
      "description": "Chef's special soup",
      "price": 14.99,
      "available_days": ["friday", "saturday"]
    }
  ],
  "upsell_tips": [
    {
      "id": "tip-wine",
      "title": "Wine Pairings",
      "body": "Suggest a wine pairing - increases avg check by 20%",
      "enabled": true,
      "display_order": 1
    }
  ]
}
```

---

## Migration from Legacy Text

1. Store original text in `raw_input` for audit trail
2. Parse into structured format using exclusion rules
3. Flag ambiguous items with `needs_review: true`
4. User reviews and fixes flagged items in MenuManager
5. Once reviewed, `raw_input` is retained but never re-parsed
