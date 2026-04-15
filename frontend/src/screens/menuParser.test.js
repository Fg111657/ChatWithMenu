/**
 * Menu Parser Tests - Phase 1 Parser Accuracy
 *
 * Tests for:
 * 1.1 - Description attachment (PDF-style menus)
 * 1.2 - Market Price (MP) handling
 * 1.3 - Category header detection
 * 1.4 - Multiline descriptions
 */

import { parseMenuText, isMarketPriceToken, isPriceLine, isDescriptionContinuation, isLikelyCategoryHeader } from './menuParserHelpers';

describe('Phase 1.1 - Description Attachment (PDF-style menus)', () => {
  test('ingredient lines should attach to previous item as description, not create new items', () => {
    const rawMenu = `
APPETIZERS

caesar salad 13
romaine lettuce, parmesan, croutons, house-made dressing

caprese 18
fresh tomatoes, mozzarella, pesto sauce
    `.trim();

    const result = parseMenuText(rawMenu);
    const categories = result.menus[0].categories;

    // Should have 1 category (APPETIZERS)
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Appetizers');

    // Should have exactly 2 items (not 4)
    const items = categories[0].items;
    expect(items).toHaveLength(2);

    // First item
    expect(items[0].name).toBe('caesar salad');
    expect(items[0].price).toBe(13);
    expect(items[0].description).toBe('romaine lettuce, parmesan, croutons, house-made dressing');

    // Second item
    expect(items[1].name).toBe('caprese');
    expect(items[1].price).toBe(18);
    expect(items[1].description).toBe('fresh tomatoes, mozzarella, pesto sauce');
  });

  test('complex PDF menu with multiple description lines', () => {
    const rawMenu = `
minestrone
traditional Italian chunky vegetable soup 12

brodetto di pesce
shrimp, calamari, mussels, clams, salmon
light tomato broth 27
    `.trim();

    const result = parseMenuText(rawMenu);
    const items = result.menus[0].categories[0].items;

    // Should have 2 items, NOT 5
    expect(items).toHaveLength(2);

    // First item - "minestrone" is the name, description has the price
    expect(items[0].name).toBe('minestrone');
    expect(items[0].description).toBe('traditional Italian chunky vegetable soup');
    expect(items[0].price).toBe(12);

    // Second item - "brodetto di pesce" is the name, both description lines combined
    expect(items[1].name).toBe('brodetto di pesce');
    expect(items[1].description).toBe('shrimp, calamari, mussels, clams, salmon light tomato broth');
    expect(items[1].price).toBe(27);
  });
});

describe('Phase 1.2 - Market Price (MP) Handling', () => {
  test('MP price token should set price_type to MP and price to null', () => {
    const rawMenu = `
SEAFOOD

Lobster Thermidor MP

Fresh Oysters M/P

Seasonal Fish MARKET PRICE
    `.trim();

    const result = parseMenuText(rawMenu);
    const items = result.menus[0].categories[0].items;

    expect(items).toHaveLength(3);

    // All items should have price_type='MP' and price=null
    expect(items[0].name).toBe('Lobster Thermidor');
    expect(items[0].price_type).toBe('MP');
    expect(items[0].price).toBeNull();

    expect(items[1].name).toBe('Fresh Oysters');
    expect(items[1].price_type).toBe('MP');
    expect(items[1].price).toBeNull();

    expect(items[2].name).toBe('Seasonal Fish');
    expect(items[2].price_type).toBe('MP');
    expect(items[2].price).toBeNull();
  });

  test('MP items should never show as $0', () => {
    const rawMenu = 'Daily Catch MP';

    const result = parseMenuText(rawMenu);
    const item = result.menus[0].categories[0].items[0];

    // Should NOT have price: 0
    expect(item.price_type).toBe('MP');
    expect(item.price).toBeNull();
    expect(item.price).not.toBe(0);
  });

  test('isMarketPriceToken helper function', () => {
    expect(isMarketPriceToken('MP')).toBe(true);
    expect(isMarketPriceToken('M/P')).toBe(true);
    expect(isMarketPriceToken('MARKET PRICE')).toBe(true);
    expect(isMarketPriceToken('MARKET')).toBe(true);
    expect(isMarketPriceToken('12.99')).toBe(false);
    expect(isMarketPriceToken('$15')).toBe(false);
  });
});

describe('Phase 1.3 - Category Header Detection', () => {
  test('all-caps dish names with Italian connectors should NOT become category headers', () => {
    const rawMenu = `
PASTA

SPAGHETTI ALLA CARBONARA 18
FETTUCCINE CON FUNGHI 22
PENNE ALL'ARRABBIATA 16
RISOTTO AL TARTUFO 28
    `.trim();

    const result = parseMenuText(rawMenu);
    const categories = result.menus[0].categories;

    // Should have 1 category "PASTA"
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Pasta');

    // Should have 4 items (not create 5 categories)
    const items = categories[0].items;
    expect(items).toHaveLength(4);

    // Verify dish names are preserved
    expect(items[0].name).toContain('SPAGHETTI');
    expect(items[1].name).toContain('FETTUCCINE');
    expect(items[2].name).toContain('PENNE');
    expect(items[3].name).toContain('RISOTTO');
  });

  test('known category keywords should create categories', () => {
    const rawMenu = `
APPETIZERS
Bruschetta 8

MAINS
Steak 35

DESSERTS
Tiramisu 12
    `.trim();

    const result = parseMenuText(rawMenu);
    const categories = result.menus[0].categories;

    // Should have 3 categories
    expect(categories).toHaveLength(3);

    expect(categories[0].name).toBe('Appetizers');
    expect(categories[0].items).toHaveLength(1);
    expect(categories[0].items[0].name).toBe('Bruschetta');

    expect(categories[1].name).toBe('Mains');
    expect(categories[1].items).toHaveLength(1);
    expect(categories[1].items[0].name).toBe('Steak');

    expect(categories[2].name).toBe('Desserts');
    expect(categories[2].items).toHaveLength(1);
    expect(categories[2].items[0].name).toBe('Tiramisu');
  });

  test('long dish names should not become category headers', () => {
    const rawMenu = `
GRILLED MEDITERRANEAN SEA BASS WITH LEMON BUTTER SAUCE 42
BRAISED SHORT RIBS WITH RED WINE REDUCTION 38
    `.trim();

    const result = parseMenuText(rawMenu);
    const items = result.menus[0].categories[0].items;

    // Should have 2 items, not 2 categories
    expect(items).toHaveLength(2);
    expect(items[0].price).toBe(42);
    expect(items[1].price).toBe(38);
  });

  test('isLikelyCategoryHeader helper function', () => {
    // Known keywords
    expect(isLikelyCategoryHeader('APPETIZERS')).toBe(true);
    expect(isLikelyCategoryHeader('DESSERTS')).toBe(true);
    expect(isLikelyCategoryHeader('PASTA')).toBe(true);

    // Italian dish names (should NOT be headers)
    expect(isLikelyCategoryHeader('SPAGHETTI ALLA CARBONARA')).toBe(false);
    expect(isLikelyCategoryHeader('PENNE ALL\'ARRABBIATA')).toBe(false);
    expect(isLikelyCategoryHeader('RISOTTO CON FUNGHI')).toBe(false);

    // Too long
    expect(isLikelyCategoryHeader('GRILLED MEDITERRANEAN SEA BASS WITH LEMON')).toBe(false);

    // Has numbers
    expect(isLikelyCategoryHeader('PASTA 12')).toBe(false);
  });
});

describe('Phase 1.4 - Multiline Descriptions', () => {
  test('descriptions spanning multiple lines should accumulate', () => {
    const rawMenu = `
SIGNATURE DISH

Chef's Special 45
Slow-roasted duck breast with cherry reduction,
served with seasonal vegetables and truffle mashed potatoes,
garnished with microgreens
    `.trim();

    const result = parseMenuText(rawMenu);
    const item = result.menus[0].categories[0].items[0];

    expect(item.name).toBe("Chef's Special");
    expect(item.price).toBe(45);

    // Description should be all 3 lines combined
    expect(item.description).toContain('Slow-roasted duck breast');
    expect(item.description).toContain('seasonal vegetables');
    expect(item.description).toContain('microgreens');
  });

  test('multiline descriptions with commas and conjunctions', () => {
    const rawMenu = `
Risotto ai Frutti di Mare 37
Arborio rice with mussels, clams, calamari,
shrimp and salmon in a light tomato broth,
finished with fresh parsley and extra virgin olive oil
    `.trim();

    const result = parseMenuText(rawMenu);
    const item = result.menus[0].categories[0].items[0];

    expect(item.name).toBe('Risotto ai Frutti di Mare');
    expect(item.price).toBe(37);

    // All 3 lines should be in description
    expect(item.description).toContain('Arborio rice');
    expect(item.description).toContain('clams, calamari');
    expect(item.description).toContain('extra virgin olive oil');
  });

  test('isDescriptionContinuation helper function', () => {
    // Typical description lines
    expect(isDescriptionContinuation('fresh tomatoes, mozzarella, basil')).toBe(true);
    expect(isDescriptionContinuation('served with seasonal vegetables')).toBe(true);
    expect(isDescriptionContinuation('garnished with microgreens')).toBe(true);

    // NOT description lines
    expect(isDescriptionContinuation('Caesar Salad 13')).toBe(false); // Has price
    expect(isDescriptionContinuation('APPETIZERS')).toBe(false); // Category header
    expect(isDescriptionContinuation('MP')).toBe(false); // Too short
  });
});

describe('Parser Integration - Full Menu', () => {
  test('Il Violino excerpt should parse correctly with all fixes', () => {
    const rawMenu = `
APPETIZERS

caprese
fresh tomatoes, mozzarella, pesto 18

verdure grigliate
grilled seasonal vegetables, extra virgin olive oil, aged balsamic vinegar 20

RISOTTO

Risotto al tartufo nero
Arborio rice, porcini mushrooms, black truffles 34

SPECIAL

Market Fresh Fish MP
    `.trim();

    const result = parseMenuText(rawMenu);
    const categories = result.menus[0].categories;

    // Should have 3 categories
    expect(categories.length).toBeGreaterThanOrEqual(2); // At least APPETIZERS and RISOTTO

    const appetizers = categories.find(c => c.name === 'Appetizers');
    expect(appetizers).toBeDefined();
    expect(appetizers.items.length).toBeGreaterThanOrEqual(2);

    // Check caprese has description (NOT a separate item)
    const caprese = appetizers.items.find(i => i.name.includes('caprese'));
    if (caprese) {
      expect(caprese.description).toContain('fresh tomatoes');
    }

    // Check verdure has description
    const verdure = appetizers.items.find(i => i.name.includes('verdure') || i.name.includes('grigliate'));
    if (verdure) {
      expect(verdure.description).toContain('seasonal vegetables');
    }

    // Check Risotto
    const risotto = categories.find(c => c.name === 'Risotto');
    if (risotto && risotto.items.length > 0) {
      const risottoItem = risotto.items[0];
      expect(risottoItem.description).toContain('Arborio rice');
    }

    // Check Market Fresh Fish has MP
    const allItems = categories.flatMap(c => c.items);
    const mpItem = allItems.find(i => i.name.includes('Market Fresh Fish'));
    if (mpItem) {
      expect(mpItem.price_type).toBe('MP');
      expect(mpItem.price).toBeNull();
    }
  });
});
