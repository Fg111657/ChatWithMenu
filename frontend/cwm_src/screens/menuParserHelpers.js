/**
 * Menu Parser Helpers - Phase 1 Enhanced
 *
 * Implements:
 * - Description attachment (PDF-style menus)
 * - Market Price (MP) handling
 * - Improved category header detection
 * - Multiline descriptions
 */

import { generateId } from './menuHelpers';

// Known category keywords
const CATEGORY_KEYWORDS = [
  'appetizer', 'appetizers', 'starter', 'starters', 'antipasti', 'antipasto',
  'entree', 'entrees', 'main', 'mains', 'secondi', 'secondo',
  'pasta', 'pastas', 'primi', 'primo', 'risotto', 'risotti',
  'soup', 'soups', 'zuppe', 'zuppa', 'salad', 'salads', 'insalate', 'insalata',
  'side', 'sides', 'contorni', 'contorno',
  'dessert', 'desserts', 'dolci', 'dolce', 'sweet', 'sweets',
  'beverage', 'beverages', 'drink', 'drinks', 'wine', 'wines', 'beer', 'beers',
  'cocktail', 'cocktails', 'coffee', 'coffees', 'tea', 'teas',
  'breakfast', 'brunch', 'lunch', 'dinner',
  'pizza', 'pizzas', 'sandwich', 'sandwiches', 'burger', 'burgers',
  'specials', 'special', 'kids', 'children', 'wrap', 'wraps',
  'seafood', 'fish', 'meat', 'vegetarian', 'vegan',
];

// Italian dish connectors that indicate it's a dish name, not a category
// Handles apostrophes in contractions like "ALL'ARRABBIATA"
const ITALIAN_DISH_CONNECTORS = /\b(alla|all'|al|con|di|del|della|delle|dei|degli|il|la|le|lo|e)\b/i;

// Market price indicators
const MARKET_PRICE_PATTERNS = [
  /\bMP\b/i,
  /\bM\/P\b/i,
  /\bMARKET\s*PRICE\b/i,
  /\bMARKET\b/i,
  /\bSEASONAL\s*PRICE\b/i,
];

/**
 * Check if a token indicates market pricing
 */
export const isMarketPriceToken = (text) => {
  if (!text) return false;
  return MARKET_PRICE_PATTERNS.some(pattern => pattern.test(text.trim()));
};

/**
 * Check if line contains a detectable price
 */
export const isPriceLine = (line) => {
  if (!line) return false;
  // Check for $12, 12, 12.00, etc.
  const pricePattern = /\$?\d+(?:\.\d{2})?/;
  return pricePattern.test(line);
};

/**
 * Check if line is a description continuation
 * (ingredient list, serving notes, etc.)
 */
export const isDescriptionContinuation = (line) => {
  if (!line || line.trim().length < 5) return false;

  const trimmed = line.trim();

  // Has a price token = not a description
  if (/\$?\d+(?:\.\d{2})?$/.test(trimmed)) return false;

  // Has a market price indicator = not a description, it's an item line
  if (isMarketPriceToken(trimmed) || /\b(MP|M\/P|MARKET\s+PRICE)\s*$/i.test(trimmed)) return false;

  // Is a category header = not a description
  if (isLikelyCategoryHeader(line)) return false;

  // Looks like ingredients/prose characteristics:
  // - Contains commas (ingredient lists)
  // - Contains common description words
  // Be conservative: don't use "starts with lowercase" alone as it matches dish names too
  const descriptionIndicators = [
    /,/, // Has commas (ingredients)
    /\b(with|served|topped|garnished|includes|contains|fresh|seasonal|house-made|homemade)\b/i,
    /\b(sauce|dressing|reduction|butter|oil|vinegar|cheese|vegetables|potatoes)\b/i,
  ];

  return descriptionIndicators.some(pattern => pattern.test(trimmed));
};

/**
 * Check if line is likely a category header (not a dish name)
 *
 * Phase 1.3 Enhancement: Tighter detection to avoid false positives
 */
export const isLikelyCategoryHeader = (line) => {
  if (!line) return false;
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  // Too long to be a category (categories are usually 1-3 words, < 30 chars)
  if (trimmed.length > 30) return false;

  // Contains numbers = likely a price, not a category
  if (/\d/.test(trimmed)) return false;

  // Has market price indicator = it's an item, not a category
  if (isMarketPriceToken(trimmed) || /\b(MP|M\/P|MARKET\s+PRICE)\s*$/i.test(trimmed)) {
    return false;
  }

  // CRITICAL: Check for Italian dish connectors FIRST
  // If it has connectors, it's a dish name, not a category
  // Examples: "RISOTTO CON FUNGHI", "SPAGHETTI ALLA CARBONARA"
  if (ITALIAN_DISH_CONNECTORS.test(trimmed)) {
    return false; // It's a dish name
  }

  // Check if it matches known category keywords
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (CATEGORY_KEYWORDS.includes(word)) return true;
  }

  // Check full phrase match
  if (CATEGORY_KEYWORDS.includes(lower)) return true;

  // ALL CAPS + short = potential category (1-3 words)
  if (trimmed.length < 25 && trimmed === trimmed.toUpperCase() && words.length <= 3) {
    // Short all-caps phrase is likely a category
    // Examples: "APPETIZERS", "SIGNATURE DISH", "CHEF SPECIALS"
    return true;
  }

  return false;
};

/**
 * Format category name (Title Case)
 */
export const formatCategoryName = (name) => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Parse a line that may contain modifiers
 * Enhanced for Phase 1.2 - Market Price support
 */
export const parseLineWithModifiers = (line) => {
  // Strip "Item:" prefix if present
  line = line.replace(/^Item:\s*/i, '').trim();

  // Check for market price FIRST (multi-word patterns need more flexible matching)
  const mpMatch = line.match(/^(.+?)\s+(MP|M\/P|MARKET\s+PRICE|MARKET|SEASONAL\s+PRICE)\s*$/i);
  if (mpMatch) {
    return {
      name: mpMatch[1].trim(),
      price: null,
      price_type: 'MP',
      modifiers: [],
    };
  }

  // Pattern: "Name basePrice | modifier1 price1 | modifier2 price2"
  const parts = line.split(/\s*\|\s*/);

  if (parts.length === 1) {
    // No pipe - check for "extra $X" or "add $X" modifier pattern
    const extraMatch = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*[-–]\s*(.+?)\s+(?:extra|add)?\s*\$?(\d+(?:\.\d{2})?)\s*$/i);
    if (extraMatch) {
      return {
        name: extraMatch[1].trim(),
        price: parseFloat(extraMatch[2]),
        price_type: 'FIXED',
        modifiers: [{
          id: generateId(),
          name: extraMatch[3].trim(),
          price: parseFloat(extraMatch[4]),
        }],
      };
    }

    // Simple line: "Dish Name 12.99"
    const simpleMatch = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*$/);
    if (simpleMatch && simpleMatch[1].trim().length > 2) {
      return {
        name: simpleMatch[1].trim(),
        price: parseFloat(simpleMatch[2]),
        price_type: 'FIXED',
        modifiers: [],
      };
    }

    return null; // No price found
  }

  // Multi-part with modifiers
  const basePart = parts[0].trim();
  const baseMatch = basePart.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*$/);

  if (!baseMatch) return null;

  const name = baseMatch[1].trim();
  const basePrice = parseFloat(baseMatch[2]);
  const modifiers = [];

  // Parse modifier parts
  for (let i = 1; i < parts.length; i++) {
    const modPart = parts[i].trim();

    // Pattern: "with chicken or shrimp 27" (shared price)
    const sharedMatch = modPart.match(/^(.+?)\s+or\s+(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*$/i);
    if (sharedMatch) {
      const modPrice = parseFloat(sharedMatch[3]) - basePrice;
      modifiers.push({
        id: generateId(),
        name: sharedMatch[1].trim(),
        price: modPrice,
      });
      modifiers.push({
        id: generateId(),
        name: sharedMatch[2].trim(),
        price: modPrice,
      });
      continue;
    }

    // Pattern: "modifier name 27" (individual price)
    const indivMatch = modPart.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*$/);
    if (indivMatch) {
      const modPrice = parseFloat(indivMatch[2]) - basePrice;
      modifiers.push({
        id: generateId(),
        name: indivMatch[1].trim(),
        price: modPrice,
      });
    }
  }

  return {
    name,
    price: basePrice,
    price_type: 'FIXED',
    modifiers,
  };
};

/**
 * Check if item needs review
 */
export const checkNeedsReview = (item, originalLine = '') => {
  const reasons = [];
  let needsReview = false;

  // Name too short
  if (item.name.length < 3) {
    reasons.push('Name too short');
  }

  // Name looks like a category header (single word, common header terms)
  const headerTerms = ['appetizers', 'starters', 'mains', 'entrees', 'desserts', 'drinks', 'sides', 'beverages'];
  if (item.name.split(' ').length === 1 && headerTerms.includes(item.name.toLowerCase())) {
    reasons.push('May be category header');
  }

  // Price seems wrong or missing (but MP is OK)
  if (item.price_type !== 'MP') {
    if (item.price === null || item.price === undefined) {
      reasons.push('Price missing from source');
    } else if (item.price === 0) {
      reasons.push('Price is $0');
    } else if (item.price > 500) {
      reasons.push('Price unusually high');
    } else if (item.price < 0) {
      reasons.push('Price is negative');
    }
  }

  // Size/format variants (glass|bottle, single|double)
  if (/^(glass|bottle|single|double|small|medium|large)\s*$/i.test(item.name)) {
    reasons.push('May be size/format variant');
  }

  needsReview = reasons.length > 0;

  return { needsReview, reviewReasons: reasons };
};

/**
 * Detect meal period from raw menu text
 */
export const detectMealPeriod = (rawText) => {
  if (!rawText) return null;
  // Defensive: ensure rawText is a string before calling toUpperCase
  const text = String(rawText ?? "").toUpperCase();
  if (text.includes('BREAKFAST')) return 'Breakfast';
  if (text.includes('BRUNCH')) return 'Brunch';
  if (text.includes('LUNCH')) return 'Lunch';
  if (text.includes('DINNER')) return 'Dinner';
  if (text.includes('DRINKS') || text.includes('COCKTAIL')) return 'Drinks';
  return null;
};

/**
 * Main parser function - Phase 1 Enhanced
 * Returns V2 format (menus → categories → items)
 */
export const parseMenuText = (menuText) => {
  // Defensive: ensure menuText is a string
  if (typeof menuText !== 'string') {
    menuText = String(menuText ?? '');
  }

  const menu = {
    version: 2,
    currency: 'USD',
    language: 'en',
    updated_at: new Date().toISOString(),
    raw_input: menuText,
    menus: [
      {
        id: generateId(),
        name: detectMealPeriod(menuText) || 'Dinner',
        meal_period: (detectMealPeriod(menuText) || 'Dinner').toLowerCase(),
        display_order: 1,
        categories: [],
      }
    ],
    specials: [],
    upsell_tips: [],
    previous_needs_review_percent: null,
  };

  const lines = menuText.split('\n');
  let currentCategory = {
    id: generateId(),
    name: 'Menu Items',
    display_order: 1,
    items: [],
  };

  let lastItem = null; // Track last parsed item for description attachment
  let pendingDescription = []; // Buffer for multiline descriptions
  let pendingDishName = null; // Track dish name without price (PDF-style format)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle "Item: Name" structured format
    if (/^Item:\s*/i.test(line)) {
      // Flush pending description to last item
      if (lastItem && pendingDescription.length > 0) {
        lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
        pendingDescription = [];
      }

      const itemName = line.replace(/^Item:\s*/i, '').trim();
      let price = null;
      let price_type = 'FIXED';
      let description = '';

      // Look ahead for Price: line
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && /^Price:\s*/i.test(nextLine)) {
        const priceText = nextLine.replace(/^Price:\s*/i, '').trim();
        if (isMarketPriceToken(priceText)) {
          price_type = 'MP';
          price = null;
        } else {
          const priceMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }
        }
        i++; // Skip price line

        // Look for Ingr.: line after price
        const ingrLine = lines[i + 1]?.trim();
        if (ingrLine && /^Ingr\.?:\s*/i.test(ingrLine)) {
          description = ingrLine.replace(/^Ingr\.?:\s*/i, '').trim();
          i++; // Skip ingredients line
        }
      } else if (nextLine && /^Ingr\.?:\s*/i.test(nextLine)) {
        // No price, just ingredients
        description = nextLine.replace(/^Ingr\.?:\s*/i, '').trim();
        i++;
      }

      if (itemName) {
        const item = {
          id: generateId(),
          name: itemName,
          description: description,
          price: price,
          price_type: price_type,
          allergens: [],
          dietary_tags: [],
          prep_methods: [],
          modifiers: [],
          modifier_groups: [],
          removable_ingredients: [],
          available: true,
          needs_review: false,
          review_reasons: [],
          source: 'parsed', // Track that this was auto-parsed
        };

        const reviewCheck = checkNeedsReview(item, line);
        item.needs_review = reviewCheck.needsReview;
        item.review_reasons = reviewCheck.reviewReasons;

        currentCategory.items.push(item);
        lastItem = item;
      }
      continue;
    }

    // Check if it's a category header
    if (isLikelyCategoryHeader(line)) {
      // Flush pending description to last item
      if (lastItem && pendingDescription.length > 0) {
        lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
        pendingDescription = [];
      }

      // Clear pending dish name (category headers reset context)
      pendingDishName = null;

      // Save current category if it has items
      if (currentCategory.items.length > 0) {
        menu.menus[0].categories.push(currentCategory);
      }
      currentCategory = {
        id: generateId(),
        name: formatCategoryName(line),
        display_order: menu.menus[0].categories.length + 1,
        items: [],
      };
      lastItem = null;
      continue;
    }

    // Try to parse as dish line (traditional format: "Dish Name 12.99")
    const parsed = parseLineWithModifiers(line);
    if (parsed && parsed.name) {
      // Case 1: Line has price and there's a pending dish name (PDF-style format)
      // Example: "minestrone" followed by "traditional Italian chunky vegetable soup 12"
      if (pendingDishName) {
        // Combine pending description + current line's text as full description
        const fullDescription = [...pendingDescription, parsed.name].join(' ').trim();

        const item = {
          id: generateId(),
          name: pendingDishName,
          description: fullDescription,
          price: parsed.price,
          price_type: parsed.price_type || 'FIXED',
          allergens: [],
          dietary_tags: [],
          prep_methods: [],
          modifiers: parsed.modifiers || [],
          modifier_groups: [],
          removable_ingredients: [],
          available: true,
          needs_review: false,
          review_reasons: [],
          source: 'parsed', // Track that this was auto-parsed
        };

        const reviewCheck = checkNeedsReview(item, line);
        item.needs_review = reviewCheck.needsReview;
        item.review_reasons = reviewCheck.reviewReasons;

        currentCategory.items.push(item);
        lastItem = item;

        // Clear pending state
        pendingDishName = null;
        pendingDescription = [];
      }
      // Case 2: Line has price, no pending dish name (standard format)
      // Example: "caesar salad 13"
      else {
        // Flush any pending description to previous item
        if (lastItem && pendingDescription.length > 0) {
          lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
          pendingDescription = [];
        }

        const item = {
          id: generateId(),
          name: parsed.name,
          description: '',
          price: parsed.price,
          price_type: parsed.price_type || 'FIXED',
          allergens: [],
          dietary_tags: [],
          prep_methods: [],
          modifiers: parsed.modifiers || [],
          modifier_groups: [],
          removable_ingredients: [],
          available: true,
          needs_review: false,
          review_reasons: [],
          source: 'parsed', // Track that this was auto-parsed
        };

        const reviewCheck = checkNeedsReview(item, line);
        item.needs_review = reviewCheck.needsReview;
        item.review_reasons = reviewCheck.reviewReasons;

        currentCategory.items.push(item);
        lastItem = item;
      }
    }
    // Case 3: Line has no price - could be description or dish name
    else if (isDescriptionContinuation(line)) {
      // If there's a pending dish name, add to its description
      if (pendingDishName) {
        pendingDescription.push(line);
      }
      // Otherwise, add to last item's description
      else if (lastItem) {
        pendingDescription.push(line);
      }
      // No pending dish name and no last item - treat as new pending dish name
      else {
        pendingDishName = line;
      }
    }
    // Case 4: Line doesn't look like description - might be a dish name
    else {
      // Flush any pending description to last item
      if (lastItem && pendingDescription.length > 0) {
        lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
        pendingDescription = [];
      }

      // Treat as new pending dish name
      pendingDishName = line;
    }
  }

  // Flush any remaining pending description
  if (lastItem && pendingDescription.length > 0) {
    lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
  }

  // Add final category if it has items
  if (currentCategory.items.length > 0) {
    menu.menus[0].categories.push(currentCategory);
  }

  return menu;
};
