/**
 * Tests for menuApiGuards.js - V2 Format Enforcement
 *
 * Covers:
 * 1. Guard throws on invalid V2 shape
 * 2. Guard accepts valid V2 with categories
 * 3. MP item validation (price must be null)
 * 4. FIXED item validation (price must be number)
 * 5. V1 sections format rejection
 * 6. Negative price rejection
 */

import { assertMenuDataV2, isValidV2, getFriendlyErrorMessage } from './menuApiGuards';

describe('menuApiGuards - V2 Format Enforcement', () => {
  // Test 1: Guard throws on invalid V2 shape
  test('throws on missing version', () => {
    const invalidData = {
      menus: []
    };

    expect(() => assertMenuDataV2(invalidData)).toThrow();
    expect(() => assertMenuDataV2(invalidData)).toThrow(/outdated/i);
  });

  test('throws on missing menus array', () => {
    const invalidData = {
      version: 2
    };

    expect(() => assertMenuDataV2(invalidData)).toThrow();
    expect(() => assertMenuDataV2(invalidData)).toThrow(/missing.*menus/i);
  });

  test('throws on V1 sections format', () => {
    const v1Data = {
      version: 1,
      sections: [
        { name: 'Appetizers', items: [] }
      ]
    };

    expect(() => assertMenuDataV2(v1Data)).toThrow();
    expect(() => assertMenuDataV2(v1Data)).toThrow(/outdated.*version/i);
  });

  test('throws when sections key present', () => {
    const mixedData = {
      version: 2,
      sections: [], // V1 key not allowed
      menus: []
    };

    expect(() => assertMenuDataV2(mixedData)).toThrow();
    expect(() => assertMenuDataV2(mixedData)).toThrow(/sections.*outdated/i);
  });

  // Test 2: Guard accepts valid V2 with categories
  test('accepts valid V2 with empty menus', () => {
    const validData = {
      version: 2,
      currency: 'USD',
      language: 'en',
      menus: [],
      specials: [],
      upsell_tips: []
    };

    expect(() => assertMenuDataV2(validData)).not.toThrow();
  });

  test('accepts valid V2 with categories and items', () => {
    const validData = {
      version: 2,
      currency: 'USD',
      language: 'en',
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          display_order: 1,
          categories: [
            {
              id: 'cat-1',
              name: 'Entrees',
              display_order: 1,
              items: [
                {
                  id: 'item-1',
                  name: 'Burger',
                  price_type: 'FIXED',
                  price: 15.00,
                  description: 'Delicious burger',
                  allergens: [],
                  dietary_tags: []
                }
              ]
            }
          ]
        }
      ],
      specials: [],
      upsell_tips: []
    };

    expect(() => assertMenuDataV2(validData)).not.toThrow();
  });

  // Test 3: MP item validation (price must be null)
  test('throws when MP item has numeric price', () => {
    const invalidMPData = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Seafood',
              items: [
                {
                  id: 'item-1',
                  name: 'Lobster',
                  price_type: 'MP',
                  price: 45.00 // Invalid: MP must have null price
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(invalidMPData)).toThrow();
    expect(() => assertMenuDataV2(invalidMPData)).toThrow(/Lobster.*MP.*price.*null/i);
  });

  test('accepts MP item with null price', () => {
    const validMPData = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Seafood',
              items: [
                {
                  id: 'item-1',
                  name: 'Lobster',
                  price_type: 'MP',
                  price: null // Correct
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(validMPData)).not.toThrow();
  });

  // Test 4: FIXED item validation (price must be number)
  test('throws when FIXED item has null price', () => {
    const invalidFixedData = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Entrees',
              items: [
                {
                  id: 'item-1',
                  name: 'Burger',
                  price_type: 'FIXED',
                  price: null // Invalid: FIXED must have numeric price
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(invalidFixedData)).toThrow();
    expect(() => assertMenuDataV2(invalidFixedData)).toThrow(/Burger.*FIXED.*numeric/i);
  });

  test('accepts FIXED item with numeric price', () => {
    const validFixedData = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Entrees',
              items: [
                {
                  id: 'item-1',
                  name: 'Burger',
                  price_type: 'FIXED',
                  price: 15.00 // Correct
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(validFixedData)).not.toThrow();
  });

  // Test 5: Negative price rejection
  test('throws when item has negative price', () => {
    const negativePrice = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Entrees',
              items: [
                {
                  id: 'item-1',
                  name: 'Burger',
                  price_type: 'FIXED',
                  price: -10.00 // Invalid: negative price
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(negativePrice)).toThrow();
    expect(() => assertMenuDataV2(negativePrice)).toThrow(/negative/i);
  });

  // Test 6: Missing item name
  test('throws when item has no name', () => {
    const noName = {
      version: 2,
      menus: [
        {
          id: 'menu-1',
          name: 'Dinner',
          categories: [
            {
              id: 'cat-1',
              name: 'Entrees',
              items: [
                {
                  id: 'item-1',
                  name: '', // Invalid: empty name
                  price_type: 'FIXED',
                  price: 15.00
                }
              ]
            }
          ]
        }
      ]
    };

    expect(() => assertMenuDataV2(noName)).toThrow();
    expect(() => assertMenuDataV2(noName)).toThrow(/name/i);
  });

  // Helper function tests
  test('isValidV2 returns true for valid data', () => {
    const validData = {
      version: 2,
      menus: []
    };

    expect(isValidV2(validData)).toBe(true);
  });

  test('isValidV2 returns false for invalid data', () => {
    const invalidData = {
      version: 1,
      sections: []
    };

    expect(isValidV2(invalidData)).toBe(false);
  });

  test('getFriendlyErrorMessage returns message from error', () => {
    const error = new Error('Test error message');
    expect(getFriendlyErrorMessage(error)).toBe('Test error message');
  });

  test('getFriendlyErrorMessage returns fallback for null error', () => {
    expect(getFriendlyErrorMessage(null)).toContain('unrecognized format');
  });

  // Integration test: realistic menu data
  test('accepts realistic menu with multiple items and categories', () => {
    const realisticMenu = {
      version: 2,
      currency: 'USD',
      language: 'en',
      updated_at: '2026-01-14T12:00:00Z',
      raw_input: '',
      menus: [
        {
          id: 'dinner-menu',
          name: 'Dinner',
          display_order: 1,
          categories: [
            {
              id: 'appetizers',
              name: 'Appetizers',
              display_order: 1,
              items: [
                {
                  id: 'wings',
                  name: 'Buffalo Wings',
                  price_type: 'FIXED',
                  price: 12.99,
                  description: 'Spicy buffalo wings',
                  allergens: ['dairy'],
                  dietary_tags: [],
                  prep_methods: ['Fried']
                },
                {
                  id: 'oysters',
                  name: 'Fresh Oysters',
                  price_type: 'MP',
                  price: null,
                  description: 'Daily catch',
                  allergens: ['shellfish'],
                  dietary_tags: ['gluten-free']
                }
              ]
            },
            {
              id: 'entrees',
              name: 'Entrees',
              display_order: 2,
              items: [
                {
                  id: 'steak',
                  name: 'Ribeye Steak',
                  price_type: 'FIXED',
                  price: 34.99,
                  description: '12oz ribeye',
                  allergens: [],
                  dietary_tags: ['gluten-free'],
                  prep_methods: ['Grilled']
                }
              ]
            }
          ]
        }
      ],
      specials: [],
      upsell_tips: []
    };

    expect(() => assertMenuDataV2(realisticMenu)).not.toThrow();
    expect(isValidV2(realisticMenu)).toBe(true);
  });
});
