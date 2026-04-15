/**
 * Phase 3.3-D: Menu Quality/Confidence Tests
 * Tests for computeMenuQuality helper and per-menu confidence metrics
 */

// Mock computeMenuQuality function for testing
const computeMenuQuality = (menu) => {
  if (!menu || !menu.categories) {
    return {
      totalItems: 0,
      needsReviewCount: 0,
      needsReviewPercent: 0,
      confidence: 'NONE',
      confidenceLabel: 'No Data',
      confidenceColor: 'default'
    };
  }

  const allItems = menu.categories.flatMap(c => c.items || []);
  const totalItems = allItems.length;
  const needsReviewCount = allItems.filter(i => i.needs_review).length;
  const needsReviewPercent = totalItems > 0 ? (needsReviewCount / totalItems) * 100 : 0;

  // Handle empty menu (no items)
  if (totalItems === 0) {
    return {
      totalItems: 0,
      needsReviewCount: 0,
      needsReviewPercent: 0,
      confidence: 'NONE',
      confidenceLabel: 'No Data',
      confidenceColor: 'default'
    };
  }

  // Confidence thresholds (inverse of needs_review)
  let confidence, confidenceLabel, confidenceColor;
  if (needsReviewPercent === 0) {
    confidence = 'HIGH';
    confidenceLabel = 'High Quality';
    confidenceColor = 'success';
  } else if (needsReviewPercent <= 25) {
    confidence = 'MEDIUM';
    confidenceLabel = 'Good Quality';
    confidenceColor = 'info';
  } else if (needsReviewPercent <= 50) {
    confidence = 'LOW';
    confidenceLabel = 'Needs Attention';
    confidenceColor = 'warning';
  } else {
    confidence = 'VERY_LOW';
    confidenceLabel = 'Needs Review';
    confidenceColor = 'error';
  }

  return {
    totalItems,
    needsReviewCount,
    needsReviewPercent: Math.round(needsReviewPercent),
    confidence,
    confidenceLabel,
    confidenceColor
  };
};

describe('MenuManager - Menu Quality (Phase 3.3-D)', () => {
  /**
   * Test 1: High confidence when 0% needs review
   */
  test('HIGH confidence when 0% items need review', () => {
    const menu = {
      id: 'dinner-menu',
      name: 'Dinner',
      categories: [
        {
          id: 'cat-1',
          name: 'Entrees',
          items: [
            { id: 'item-1', name: 'Steak', needs_review: false },
            { id: 'item-2', name: 'Salmon', needs_review: false }
          ]
        }
      ]
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(2);
    expect(quality.needsReviewCount).toBe(0);
    expect(quality.needsReviewPercent).toBe(0);
    expect(quality.confidence).toBe('HIGH');
    expect(quality.confidenceLabel).toBe('High Quality');
    expect(quality.confidenceColor).toBe('success');
  });

  /**
   * Test 2: Medium confidence when 1-25% needs review
   */
  test('MEDIUM confidence when 25% items need review', () => {
    const menu = {
      id: 'dinner-menu',
      name: 'Dinner',
      categories: [
        {
          id: 'cat-1',
          name: 'Entrees',
          items: [
            { id: 'item-1', name: 'Steak', needs_review: false },
            { id: 'item-2', name: 'Salmon', needs_review: false },
            { id: 'item-3', name: 'Chicken', needs_review: false },
            { id: 'item-4', name: 'Fish', needs_review: true } // 1/4 = 25%
          ]
        }
      ]
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(4);
    expect(quality.needsReviewCount).toBe(1);
    expect(quality.needsReviewPercent).toBe(25);
    expect(quality.confidence).toBe('MEDIUM');
    expect(quality.confidenceLabel).toBe('Good Quality');
    expect(quality.confidenceColor).toBe('info');
  });

  /**
   * Test 3: Low confidence when 26-50% needs review
   */
  test('LOW confidence when 50% items need review', () => {
    const menu = {
      id: 'lunch-menu',
      name: 'Lunch',
      categories: [
        {
          id: 'cat-1',
          name: 'Sandwiches',
          items: [
            { id: 'item-1', name: 'BLT', needs_review: false },
            { id: 'item-2', name: 'Club', needs_review: true } // 1/2 = 50%
          ]
        }
      ]
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(2);
    expect(quality.needsReviewCount).toBe(1);
    expect(quality.needsReviewPercent).toBe(50);
    expect(quality.confidence).toBe('LOW');
    expect(quality.confidenceLabel).toBe('Needs Attention');
    expect(quality.confidenceColor).toBe('warning');
  });

  /**
   * Test 4: Very low confidence when >50% needs review
   */
  test('VERY_LOW confidence when 75% items need review', () => {
    const menu = {
      id: 'brunch-menu',
      name: 'Brunch',
      categories: [
        {
          id: 'cat-1',
          name: 'Breakfast',
          items: [
            { id: 'item-1', name: 'Pancakes', needs_review: true },
            { id: 'item-2', name: 'Waffles', needs_review: true },
            { id: 'item-3', name: 'Eggs', needs_review: true },
            { id: 'item-4', name: 'Toast', needs_review: false } // 3/4 = 75%
          ]
        }
      ]
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(4);
    expect(quality.needsReviewCount).toBe(3);
    expect(quality.needsReviewPercent).toBe(75);
    expect(quality.confidence).toBe('VERY_LOW');
    expect(quality.confidenceLabel).toBe('Needs Review');
    expect(quality.confidenceColor).toBe('error');
  });

  /**
   * Test 5: Empty menu returns NONE confidence
   */
  test('NONE confidence when menu has no items', () => {
    const menu = {
      id: 'empty-menu',
      name: 'Empty',
      categories: []
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(0);
    expect(quality.needsReviewCount).toBe(0);
    expect(quality.needsReviewPercent).toBe(0);
    expect(quality.confidence).toBe('NONE');
    expect(quality.confidenceLabel).toBe('No Data');
    expect(quality.confidenceColor).toBe('default');
  });

  /**
   * Test 6: Null menu returns NONE confidence
   */
  test('NONE confidence when menu is null', () => {
    const menu = null;

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(0);
    expect(quality.needsReviewCount).toBe(0);
    expect(quality.needsReviewPercent).toBe(0);
    expect(quality.confidence).toBe('NONE');
    expect(quality.confidenceLabel).toBe('No Data');
    expect(quality.confidenceColor).toBe('default');
  });

  /**
   * Test 7: Menu with no categories returns NONE confidence
   */
  test('NONE confidence when menu has no categories property', () => {
    const menu = {
      id: 'no-categories-menu',
      name: 'No Categories'
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(0);
    expect(quality.needsReviewCount).toBe(0);
    expect(quality.confidence).toBe('NONE');
  });

  /**
   * Test 8: Threshold boundary - exactly 0% (HIGH)
   */
  test('boundary: 0% needs_review = HIGH confidence', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: false },
          { id: '2', needs_review: false }
        ]
      }]
    };

    const quality = computeMenuQuality(menu);
    expect(quality.needsReviewPercent).toBe(0);
    expect(quality.confidence).toBe('HIGH');
  });

  /**
   * Test 9: Threshold boundary - exactly 25% (MEDIUM)
   */
  test('boundary: 25% needs_review = MEDIUM confidence', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: true },
          { id: '2', needs_review: false },
          { id: '3', needs_review: false },
          { id: '4', needs_review: false }
        ]
      }]
    };

    const quality = computeMenuQuality(menu);
    expect(quality.needsReviewPercent).toBe(25);
    expect(quality.confidence).toBe('MEDIUM');
  });

  /**
   * Test 10: Threshold boundary - exactly 50% (LOW)
   */
  test('boundary: 50% needs_review = LOW confidence', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: true },
          { id: '2', needs_review: false }
        ]
      }]
    };

    const quality = computeMenuQuality(menu);
    expect(quality.needsReviewPercent).toBe(50);
    expect(quality.confidence).toBe('LOW');
  });

  /**
   * Test 11: Threshold boundary - 51% (VERY_LOW)
   */
  test('boundary: 51% needs_review = VERY_LOW confidence', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: true },
          { id: '2', needs_review: true },
          { id: '3', needs_review: false },
          { id: '4', needs_review: false },
          { id: '5', needs_review: false },
          { id: '6', needs_review: false },
          { id: '7', needs_review: false },
          { id: '8', needs_review: false },
          { id: '9', needs_review: false },
          { id: '10', needs_review: false },
          { id: '11', needs_review: false },
          { id: '12', needs_review: false },
          { id: '13', needs_review: false },
          { id: '14', needs_review: false },
          { id: '15', needs_review: false },
          { id: '16', needs_review: false },
          { id: '17', needs_review: false },
          { id: '18', needs_review: false },
          { id: '19', needs_review: false },
          { id: '20', needs_review: false }
        ] // 2/20 = 10% actually, let me fix
      }]
    };

    // Actually need 51% so 51/100 items need review
    const menuWith51Percent = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: Array(100).fill(null).map((_, i) => ({
          id: `item-${i}`,
          needs_review: i < 51 // First 51 items need review
        }))
      }]
    };

    const quality = computeMenuQuality(menuWith51Percent);
    expect(quality.needsReviewPercent).toBe(51);
    expect(quality.confidence).toBe('VERY_LOW');
  });

  /**
   * Test 12: Multiple categories - items counted from all
   */
  test('items from all categories are counted', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [
        {
          id: 'cat-1',
          items: [
            { id: 'item-1', needs_review: true },
            { id: 'item-2', needs_review: false }
          ]
        },
        {
          id: 'cat-2',
          items: [
            { id: 'item-3', needs_review: true },
            { id: 'item-4', needs_review: false }
          ]
        }
      ]
    };

    const quality = computeMenuQuality(menu);

    expect(quality.totalItems).toBe(4);
    expect(quality.needsReviewCount).toBe(2);
    expect(quality.needsReviewPercent).toBe(50);
  });

  /**
   * Test 13: needsReviewPercent is rounded
   */
  test('needsReviewPercent is rounded to nearest integer', () => {
    const menu = {
      id: 'menu',
      name: 'Menu',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: true },
          { id: '2', needs_review: false },
          { id: '3', needs_review: false }
        ] // 1/3 = 33.333...%
      }]
    };

    const quality = computeMenuQuality(menu);
    expect(quality.needsReviewPercent).toBe(33); // Rounded
  });

  /**
   * Test 14: Per-menu quality is independent
   */
  test('quality metrics are calculated per menu independently', () => {
    const dinnerMenu = {
      id: 'dinner',
      name: 'Dinner',
      categories: [{
        id: 'cat',
        items: [
          { id: '1', needs_review: false },
          { id: '2', needs_review: false }
        ]
      }]
    };

    const lunchMenu = {
      id: 'lunch',
      name: 'Lunch',
      categories: [{
        id: 'cat',
        items: [
          { id: '3', needs_review: true },
          { id: '4', needs_review: true }
        ]
      }]
    };

    const dinnerQuality = computeMenuQuality(dinnerMenu);
    const lunchQuality = computeMenuQuality(lunchMenu);

    expect(dinnerQuality.needsReviewPercent).toBe(0);
    expect(dinnerQuality.confidence).toBe('HIGH');

    expect(lunchQuality.needsReviewPercent).toBe(100);
    expect(lunchQuality.confidence).toBe('VERY_LOW');

    // Confirm they don't affect each other
    expect(dinnerQuality.confidence).not.toBe(lunchQuality.confidence);
  });
});
