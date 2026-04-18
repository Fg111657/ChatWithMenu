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

const MARKDOWN_HEADER_PATTERN = /^\s{0,3}#{1,6}\s+/;
const MARKDOWN_BULLET_PATTERN = /^\s*(?:[-*+]\s+|\d+\.\s+)/;
const MARKDOWN_TABLE_SEPARATOR_PATTERN = /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/;

const ALLERGEN_KEYWORDS = {
  gluten: ['bread', 'flour', 'wheat', 'pasta', 'noodle', 'tortilla', 'bun', 'croutons', 'crouton', 'breaded', 'panko', 'roux', 'soy sauce', 'teriyaki', 'tempura', 'croissant', 'bagel', 'roll', 'pita', 'brioche', 'crust', 'toast', 'sandwich', 'breadcrumbs'],
  dairy: ['cheese', 'cream', 'milk', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'cheddar', 'brie', 'gouda', 'feta', 'ricotta', 'mascarpone', 'whey', 'casein', 'ghee', 'burrata', 'provolone', 'gruyere', 'swiss', 'blue cheese', 'gorgonzola', 'ranch', 'alfredo', 'queso', 'crema', 'sour cream', 'ice cream', 'gelato'],
  nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut', 'macadamia', 'pine nut', 'praline', 'marzipan', 'nougat', 'pesto'],
  eggs: ['egg', 'mayo', 'mayonnaise', 'aioli', 'hollandaise', 'custard', 'meringue', 'mousse', 'frittata', 'quiche', 'carbonara', 'caesar dressing', 'remoulade', 'tartar sauce'],
  soy: ['soy', 'tofu', 'edamame', 'miso', 'tempeh', 'soy sauce', 'teriyaki'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass', 'snapper', 'mahi', 'swordfish', 'anchovy', 'sardine', 'mackerel', 'caviar', 'roe'],
  shellfish: ['shrimp', 'crab', 'lobster', 'crawfish', 'crayfish', 'prawn', 'scallop', 'clam', 'mussel', 'oyster', 'calamari', 'squid', 'octopus'],
  sesame: ['sesame', 'tahini', 'halvah', 'hummus'],
};

const DIETARY_TAG_KEYWORDS = {
  vegan: ['vegan', 'plant-based', 'plant based'],
  vegetarian: ['vegetarian', 'veggie'],
  pescatarian: ['pescatarian'],
  'gluten-free': ['gluten-free', 'gluten free', 'gf'],
  'dairy-free': ['dairy-free', 'dairy free', 'non-dairy', 'nondairy', 'df'],
  keto: ['keto', 'low-carb', 'low carb'],
  halal: ['halal'],
  kosher: ['kosher'],
};

const PREP_METHOD_KEYWORDS = {
  grilled: ['grilled'],
  fried: ['fried'],
  'deep-fried': ['deep-fried', 'deep fried'],
  broiled: ['broiled'],
  baked: ['baked'],
  roasted: ['roasted'],
  steamed: ['steamed'],
  'sautéed': ['sautéed', 'sauteed'],
  poached: ['poached'],
  raw: ['raw', 'crudo', 'tartare', 'ceviche', 'sashimi'],
  smoked: ['smoked'],
  toasted: ['toasted'],
  braised: ['braised'],
};

const MODIFIER_GROUP_PATTERNS = [
  {
    regex: /\b(?:choice of|choose|select)\s+([a-z][a-z0-9\s/&-]{1,30})\s*:\s*([^.;]+)/ig,
    buildName: (match) => `Choose ${match[1].trim()}`,
    getOptionsText: (match) => match[2],
  },
  {
    regex: /\b(?:served with|comes with)\s+choice of\s+([^.;]+)/ig,
    buildName: () => 'Choose One',
    getOptionsText: (match) => match[1],
  },
];

const REMOVABLE_INGREDIENT_LEADS = [
  'served with',
  'topped with',
  'garnished with',
  'finished with',
  'includes',
  'contains',
  'made with',
  'stuffed with',
  'filled with',
  'layered with',
  'choice of',
  'comes with',
  'with',
];

const REMOVABLE_INGREDIENT_STOP_PHRASES = [
  'serves',
  'guests',
  'market price',
  'choice of',
  'choose',
  'select',
  'add ',
  'with ',
];

const MEAT_KEYWORDS = ['chicken', 'beef', 'steak', 'pork', 'bacon', 'sausage', 'lamb', 'veal', 'turkey', 'ham', 'prosciutto', 'meatball', 'duck'];

const cleanParsedItemName = (name) => {
  if (!name) return '';
  return name
    .replace(/\s*[-–:|]+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const cleanParsedDescription = (description) => {
  if (!description) return '';
  return String(description)
    .replace(/\s*[-–:|]+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const uniqueKeepOrder = (values) => {
  const seen = new Set();
  const unique = [];

  values.forEach((value) => {
    const cleaned = typeof value === 'string' ? value.trim() : value;
    if (!cleaned) return;
    const key = typeof cleaned === 'string' ? cleaned.toLowerCase() : JSON.stringify(cleaned);
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(cleaned);
  });

  return unique;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const textHasKeyword = (text, keyword) => {
  if (!text || !keyword) return false;
  const pattern = new RegExp(`\\b${escapeRegex(keyword).replace(/\\ /g, '\\s+')}\\b`, 'i');
  return pattern.test(text);
};

const sanitizeTextForAllergenInference = (text) => {
  if (!text) return '';

  return text
    .replace(/\b(?:gluten|dairy|egg|soy|sesame|fish|shellfish|nut|nuts)[-\s]?free\b/gi, ' ')
    .replace(/\b(?:without|no)\s+(?:gluten|dairy|egg|eggs|soy|sesame|fish|shellfish|nuts?)\b/gi, ' ')
    .replace(/\bvegan\s+(?:cheese|mayo|mayonnaise|aioli|butter|cream|milk)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const inferTagsFromKeywordMap = (text, keywordMap) => {
  if (!text) return [];

  const tags = [];
  Object.entries(keywordMap).forEach(([tag, keywords]) => {
    if (keywords.some((keyword) => textHasKeyword(text, keyword))) {
      tags.push(tag);
    }
  });
  return uniqueKeepOrder(tags);
};

const inferAllergensFromText = (text) => {
  return inferTagsFromKeywordMap(sanitizeTextForAllergenInference(text), ALLERGEN_KEYWORDS);
};

const inferDietaryTagsFromText = (text, allergens = []) => {
  const inferred = inferTagsFromKeywordMap(text, DIETARY_TAG_KEYWORDS);

  if (inferred.includes('vegan')) {
    inferred.push('vegetarian');
    inferred.push('dairy-free');
  }

  const lowerText = text.toLowerCase();
  const hasSeafood = ['fish', 'shellfish'].some((allergen) => allergens.includes(allergen));
  const hasMeat = MEAT_KEYWORDS.some((keyword) => textHasKeyword(lowerText, keyword));
  if (hasSeafood && !hasMeat) {
    inferred.push('pescatarian');
  }

  return uniqueKeepOrder(inferred);
};

const inferPrepMethodsFromText = (text) => {
  const methods = inferTagsFromKeywordMap(text, PREP_METHOD_KEYWORDS);
  if (methods.includes('deep-fried')) {
    methods.push('fried');
  }
  return uniqueKeepOrder(methods);
};

const parseSimpleModifier = (text) => {
  const match = text.match(/^(.+?)\s*(?:for\s*)?\+\$?(\d+(?:\.\d{2})?)$/i);
  if (!match) return null;

  const name = cleanParsedItemName(match[1]);
  if (!name) return null;

  return {
    id: generateId(),
    name,
    price: parseFloat(match[2]),
  };
};

const extractInlineModifiersFromText = (text) => {
  if (!text) return [];

  const modifiers = [];
  const pattern = /(?:^|[;,.])\s*(?:add|with)\s+([^;,.]+?\+\$?\d+(?:\.\d{2})?)/ig;
  let match = pattern.exec(text);
  while (match) {
    const parsed = parseSimpleModifier(match[1]);
    if (parsed) {
      modifiers.push(parsed);
    }
    match = pattern.exec(text);
  }

  return modifiers;
};

const cleanModifierOptionLabel = (value) => {
  return cleanParsedItemName(
    value
      .replace(/^(?:or|and)\s+/i, '')
      .replace(/\b(?:choice of|choose|select)\b/ig, '')
      .trim()
  );
};

const splitModifierOptions = (optionsText) => {
  if (!optionsText) return [];

  const normalized = optionsText
    .replace(/\s+or\s+/gi, ', ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s{2,}/g, ' ');

  return normalized
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean)
    .map((option, index) => {
      const parsedModifier = parseSimpleModifier(option);
      const optionName = cleanModifierOptionLabel(parsedModifier?.name || option);
      if (!optionName) return null;

      return {
        id: generateId(),
        name: optionName,
        price_delta: parsedModifier ? parsedModifier.price : 0,
        is_default: false,
        display_order: index + 1,
      };
    })
    .filter(Boolean);
};

const extractModifierGroupsFromText = (text) => {
  if (!text) return [];

  const groups = [];

  MODIFIER_GROUP_PATTERNS.forEach(({ regex, buildName, getOptionsText }) => {
    const localPattern = new RegExp(regex.source, regex.flags);
    let match = localPattern.exec(text);
    while (match) {
      const options = splitModifierOptions(getOptionsText(match));
      if (options.length >= 2) {
        groups.push({
          id: generateId(),
          name: cleanParsedItemName(buildName(match)),
          selection_type: 'SINGLE',
          min_select: 0,
          max_select: 1,
          required: false,
          display_order: groups.length + 1,
          options,
        });
      }
      match = localPattern.exec(text);
    }
  });

  return groups;
};

const normalizeIngredientPhrase = (phrase) => {
  if (!phrase) return '';

  let cleaned = phrase
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:served|topped|garnished|finished|made|stuffed|filled|layered|comes)\s+with\b/ig, '')
    .replace(/\b(?:includes|contains)\b/ig, '')
    .replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  REMOVABLE_INGREDIENT_LEADS.forEach((lead) => {
    const leadPattern = new RegExp(`^${escapeRegex(lead)}\\s+`, 'i');
    cleaned = cleaned.replace(leadPattern, '').trim();
  });

  return cleaned;
};

const splitIngredientCandidates = (text) => {
  if (!text) return [];

  const commaParts = text
    .replace(/[;]/g, ',')
    .split(',')
    .map((part) => normalizeIngredientPhrase(part))
    .filter(Boolean);

  const expanded = [];
  commaParts.forEach((part) => {
    if (!part.includes(' and ')) {
      expanded.push(part);
      return;
    }

    if (part.split(/\s+/).length <= 6) {
      part.split(/\s+and\s+/i).forEach((piece) => {
        const cleaned = normalizeIngredientPhrase(piece);
        if (cleaned) expanded.push(cleaned);
      });
      return;
    }

    expanded.push(part);
  });

  return expanded;
};

const inferRemovableIngredients = (description, itemName = '') => {
  if (!description) return [];

  const clauses = [];
  const lowerDescription = description.toLowerCase();
  const clausePattern = /\b(?:served|topped|garnished|finished|made|stuffed|filled|layered|comes)\s+with\s+([^.;]+)/ig;
  let clauseMatch = clausePattern.exec(description);
  while (clauseMatch) {
    clauses.push(clauseMatch[1]);
    clauseMatch = clausePattern.exec(description);
  }

  if (clauses.length === 0 && lowerDescription.includes(',')) {
    clauses.push(description);
  }

  const itemNameLower = itemName.toLowerCase();
  const rawIngredients = clauses.flatMap((clause) => splitIngredientCandidates(clause));

  return uniqueKeepOrder(
    rawIngredients.filter((ingredient, index) => {
      const lower = ingredient.toLowerCase();
      if (!lower || /\$?\d/.test(lower)) return false;
      if (REMOVABLE_INGREDIENT_STOP_PHRASES.some((phrase) => lower.includes(phrase))) return false;
      if (lower.split(/\s+/).length > 6) return false;

      const firstWord = lower.split(/\s+/)[0];
      if (index === 0 && itemNameLower.includes(firstWord)) return false;

      return true;
    })
  );
};

const mergeSimpleModifiers = (existing, inferred) => {
  const seen = new Set();
  const merged = [];

  [...(existing || []), ...(inferred || [])].forEach((modifier) => {
    if (!modifier?.name) return;
    const key = `${modifier.name.toLowerCase()}::${Number(modifier.price || 0).toFixed(2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({
      id: modifier.id || generateId(),
      name: cleanParsedItemName(modifier.name),
      price: Number(modifier.price || 0),
    });
  });

  return merged;
};

const mergeModifierGroups = (existing, inferred) => {
  const seen = new Set();
  const merged = [];

  [...(existing || []), ...(inferred || [])].forEach((group, index) => {
    if (!group?.name || !Array.isArray(group.options) || group.options.length === 0) return;
    const signature = `${group.name.toLowerCase()}::${group.options.map((option) => option.name.toLowerCase()).join('|')}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    merged.push({
      ...group,
      id: group.id || generateId(),
      display_order: group.display_order || index + 1,
      options: group.options.map((option, optionIndex) => ({
        ...option,
        id: option.id || generateId(),
        display_order: option.display_order || optionIndex + 1,
        price_delta: Number(option.price_delta || 0),
      })),
    });
  });

  return merged;
};

const enrichParsedItemMetadata = (item) => {
  const inferredModifiers = extractInlineModifiersFromText(item.description);
  const inferredModifierGroups = extractModifierGroupsFromText(item.description);

  item.modifiers = mergeSimpleModifiers(item.modifiers, inferredModifiers);
  item.modifier_groups = mergeModifierGroups(item.modifier_groups, inferredModifierGroups);
  item.removable_ingredients = uniqueKeepOrder([
    ...(item.removable_ingredients || []),
    ...inferRemovableIngredients(item.description, item.name),
  ]);

  const inferenceText = [
    item.name,
    item.description,
    ...(item.modifiers || []).map((modifier) => modifier.name),
    ...(item.modifier_groups || []).flatMap((group) => group.options.map((option) => option.name)),
    ...(item.removable_ingredients || []),
  ]
    .filter(Boolean)
    .join(' ');

  item.allergens = uniqueKeepOrder([...(item.allergens || []), ...inferAllergensFromText(inferenceText)]);
  item.dietary_tags = uniqueKeepOrder([...(item.dietary_tags || []), ...inferDietaryTagsFromText(inferenceText, item.allergens)]);
  item.prep_methods = uniqueKeepOrder([...(item.prep_methods || []), ...inferPrepMethodsFromText(inferenceText)]);

  return item;
};

const normalizeMarkdownLine = (rawLine) => {
  if (rawLine == null) return null;

  let line = String(rawLine).trim();
  if (!line) return null;

  if (/^```/.test(line)) return null;
  if (MARKDOWN_TABLE_SEPARATOR_PATTERN.test(line)) return null;

  let isMarkdownHeader = false;
  if (MARKDOWN_HEADER_PATTERN.test(line)) {
    isMarkdownHeader = true;
    line = line.replace(MARKDOWN_HEADER_PATTERN, '');
  }

  line = line.replace(/^>\s*/, '');
  line = line.replace(MARKDOWN_BULLET_PATTERN, '');
  line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');
  line = line.replace(/[*_`~]/g, '');
  line = line.replace(/<br\s*\/?>/gi, ' ');
  line = line.replace(/<\/?[^>]+>/g, ' ');

  if (line.includes('|')) {
    const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
    if (cells.length === 0) return null;

    const looksLikeHeaderRow = cells.every((cell) =>
      /^(item|dish|name|description|details|notes|price|cost|category)$/i.test(cell)
    );
    if (looksLikeHeaderRow) return null;

    const priceCellIndex = cells.findIndex((cell) => isMarketPriceToken(cell) || /^\$?\d+(?:\.\d{2})?$/.test(cell));
    if (priceCellIndex > 0) {
      const leadingCells = cells.slice(0, priceCellIndex).join(' - ');
      const trailingCells = cells.slice(priceCellIndex + 1).join(' - ');
      line = trailingCells
        ? `${leadingCells} ${cells[priceCellIndex]} - ${trailingCells}`.trim()
        : `${leadingCells} ${cells[priceCellIndex]}`.trim();
    } else {
      line = cells.join(' - ');
    }
  }

  line = line.replace(/\s{2,}/g, ' ').trim();
  if (!line) return null;

  return {
    text: line,
    isMarkdownHeader,
  };
};

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

  const inlineDescriptionPatterns = [
    /^(.+?)\s*[-–|]\s*(MP|M\/P|MARKET\s+PRICE|MARKET|SEASONAL\s+PRICE|\$?\d+(?:\.\d{2})?)\s*[-–|]\s*(.+)$/i,
    /^(.+?)\s+(MP|M\/P|MARKET\s+PRICE|MARKET|SEASONAL\s+PRICE|\$?\d+(?:\.\d{2})?)\s*[-–|]\s*(.+)$/i,
  ];

  for (const pattern of inlineDescriptionPatterns) {
    const match = line.match(pattern);
    if (!match) continue;

    const [, rawName, rawPrice, rawDescription] = match;
    const name = cleanParsedItemName(rawName);
    const description = cleanParsedDescription(rawDescription);

    if (!name || !description) continue;

    if (isMarketPriceToken(rawPrice)) {
      return {
        name,
        description,
        price: null,
        price_type: 'MP',
        modifiers: [],
      };
    }

    const numericPrice = rawPrice.replace(/^\$/, '');
    if (!/^\d+(?:\.\d{2})?$/.test(numericPrice)) continue;

    return {
      name,
      description,
      price: parseFloat(numericPrice),
      price_type: 'FIXED',
      modifiers: [],
    };
  }

  // Check for market price FIRST (multi-word patterns need more flexible matching)
  const mpMatch = line.match(/^(.+?)\s+(MP|M\/P|MARKET\s+PRICE|MARKET|SEASONAL\s+PRICE)\s*$/i);
  if (mpMatch) {
    return {
      name: cleanParsedItemName(mpMatch[1]),
      description: '',
      price: null,
      price_type: 'MP',
      modifiers: [],
    };
  }

  // Pattern: "Name basePrice | modifier1 price1 | modifier2 price2"
  const parts = line.split(/\s*\|\s*/);

  if (parts.length === 1) {
    // No pipe - check for "extra $X" or "add $X" modifier pattern
    const extraMatch = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*[-–]\s*(.+?)\s+(?:extra|add)\s*\$?(\d+(?:\.\d{2})?)\s*$/i);
    if (extraMatch) {
      return {
        name: cleanParsedItemName(extraMatch[1]),
        description: '',
        price: parseFloat(extraMatch[2]),
        price_type: 'FIXED',
        modifiers: [{
          id: generateId(),
          name: cleanParsedItemName(extraMatch[3]),
          price: parseFloat(extraMatch[4]),
        }],
      };
    }

    // Simple line: "Dish Name 12.99"
    const simpleMatch = line.match(/^(.+?)\s+\$?(\d+(?:\.\d{2})?)\s*$/);
    if (simpleMatch && cleanParsedItemName(simpleMatch[1]).length > 2) {
      return {
        name: cleanParsedItemName(simpleMatch[1]),
        description: '',
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

  const name = cleanParsedItemName(baseMatch[1]);
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
        name: cleanParsedItemName(sharedMatch[1]),
        price: modPrice,
      });
      modifiers.push({
        id: generateId(),
        name: cleanParsedItemName(sharedMatch[2]),
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
        name: cleanParsedItemName(indivMatch[1]),
        price: modPrice,
      });
    }
  }

  return {
    name,
    description: '',
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
    const normalizedLine = normalizeMarkdownLine(lines[i]);
    if (!normalizedLine) continue;

    const line = normalizedLine.text;
    const isMarkdownHeader = normalizedLine.isMarkdownHeader;

    if (!line) continue;

    if (isMarkdownHeader) {
      const headerText = line.replace(/\bmenu\b/i, '').trim();
      const headerMealPeriod = detectMealPeriod(line);

      if (headerMealPeriod && currentCategory.items.length === 0 && menu.menus[0].categories.length === 0) {
        menu.menus[0].name = headerMealPeriod;
        menu.menus[0].meal_period = headerMealPeriod.toLowerCase();
        pendingDishName = null;
        pendingDescription = [];
        lastItem = null;
        continue;
      }

      if (headerText) {
        if (lastItem && pendingDescription.length > 0) {
          lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
          enrichParsedItemMetadata(lastItem);
          pendingDescription = [];
        }

        pendingDishName = null;

        if (currentCategory.items.length > 0) {
          menu.menus[0].categories.push(currentCategory);
        }

        currentCategory = {
          id: generateId(),
          name: formatCategoryName(headerText),
          display_order: menu.menus[0].categories.length + 1,
          items: [],
        };
        lastItem = null;
        continue;
      }
    }

    // Handle "Item: Name" structured format
    if (/^Item:\s*/i.test(line)) {
      // Flush pending description to last item
      if (lastItem && pendingDescription.length > 0) {
        lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
        enrichParsedItemMetadata(lastItem);
        pendingDescription = [];
      }

      const itemName = line.replace(/^Item:\s*/i, '').trim();
      let price = null;
      let price_type = 'FIXED';
      let description = '';

      // Look ahead for Price: line
      const nextLine = normalizeMarkdownLine(lines[i + 1])?.text;
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
        const ingrLine = normalizeMarkdownLine(lines[i + 1])?.text;
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
        const item = enrichParsedItemMetadata({
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
        });

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
        enrichParsedItemMetadata(lastItem);
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

        const item = enrichParsedItemMetadata({
          id: generateId(),
          name: pendingDishName,
          description: cleanParsedDescription([parsed.description, fullDescription].filter(Boolean).join(' ')),
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
        });

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
          enrichParsedItemMetadata(lastItem);
          pendingDescription = [];
        }

        const item = enrichParsedItemMetadata({
          id: generateId(),
          name: parsed.name,
          description: cleanParsedDescription(parsed.description),
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
        });

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
        enrichParsedItemMetadata(lastItem);
        pendingDescription = [];
      }

      // Treat as new pending dish name
      pendingDishName = line;
    }
  }

  // Flush any remaining pending description
  if (lastItem && pendingDescription.length > 0) {
    lastItem.description = (lastItem.description + ' ' + pendingDescription.join(' ')).trim();
    enrichParsedItemMetadata(lastItem);
  }

  // Add final category if it has items
  if (currentCategory.items.length > 0) {
    menu.menus[0].categories.push(currentCategory);
  }

  return menu;
};
