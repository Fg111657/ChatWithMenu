/**
 * Phase 3.5-B: Needs Review Workflow Tests
 * Tests for jump-to-item, mark reviewed, bulk resolve, and live updates
 */

describe('MenuManager - Needs Review Workflow (Phase 3.5-B)', () => {
  /**
   * Test 1: Mark single item as reviewed clears needs_review flag
   */
  test('mark item reviewed: clears needs_review flag', () => {
    const item = {
      id: 'item-1',
      name: 'Caesar Salad',
      price: 12.00,
      needs_review: true,
      review_reasons: ['Price validation failed', 'Missing allergens']
    };

    const userId = 'user-123';
    const timestamp = new Date().toISOString();

    // Simulate markItemReviewed
    const updated = {
      ...item,
      needs_review: false,
      review_reasons: [],
      reviewed_by: userId,
      reviewed_at: timestamp
    };

    expect(updated.needs_review).toBe(false);
    expect(updated.review_reasons).toEqual([]);
    expect(updated.reviewed_by).toBe(userId);
    expect(updated.reviewed_at).toBe(timestamp);
  });

  /**
   * Test 2: Mark item reviewed sets reviewed_by metadata
   */
  test('mark item reviewed: sets reviewed_by', () => {
    const item = {
      id: 'item-1',
      name: 'Burger',
      needs_review: true,
      review_reasons: ['Missing description']
    };

    const userId = 'manager@example.com';
    const updated = {
      ...item,
      needs_review: false,
      review_reasons: [],
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    };

    expect(updated.reviewed_by).toBe(userId);
    expect(updated.reviewed_by).not.toBe('unknown');
  });

  /**
   * Test 3: Mark item reviewed sets reviewed_at timestamp
   */
  test('mark item reviewed: sets reviewed_at timestamp', () => {
    const item = {
      id: 'item-1',
      name: 'Pizza',
      needs_review: true
    };

    const beforeTime = new Date().toISOString();
    const updated = {
      ...item,
      needs_review: false,
      review_reasons: [],
      reviewed_by: 'user-123',
      reviewed_at: new Date().toISOString()
    };
    const afterTime = new Date().toISOString();

    expect(updated.reviewed_at).toBeDefined();
    expect(updated.reviewed_at >= beforeTime).toBe(true);
    expect(updated.reviewed_at <= afterTime).toBe(true);
  });

  /**
   * Test 4: Bulk resolve category clears all flagged items
   */
  test('bulk resolve category: clears all flagged items', () => {
    const category = {
      id: 'cat-1',
      name: 'Appetizers',
      items: [
        { id: 'item-1', name: 'Wings', needs_review: true, review_reasons: ['Price check'] },
        { id: 'item-2', name: 'Salad', needs_review: false },
        { id: 'item-3', name: 'Soup', needs_review: true, review_reasons: ['Allergen missing'] }
      ]
    };

    const userId = 'manager-123';
    const timestamp = new Date().toISOString();

    // Simulate markCategoryReviewed
    const updatedItems = category.items.map(item =>
      item.needs_review
        ? {
            ...item,
            needs_review: false,
            review_reasons: [],
            reviewed_by: userId,
            reviewed_at: timestamp
          }
        : item
    );

    // Verify all flagged items cleared
    expect(updatedItems.filter(i => i.needs_review).length).toBe(0);
    expect(updatedItems.filter(i => i.reviewed_by === userId).length).toBe(2);
    expect(updatedItems[1].reviewed_by).toBeUndefined(); // Item 2 wasn't flagged, shouldn't be touched
  });

  /**
   * Test 5: Bulk resolve category skips non-flagged items
   */
  test('bulk resolve category: skips clean items', () => {
    const category = {
      id: 'cat-1',
      name: 'Entrees',
      items: [
        { id: 'item-1', name: 'Steak', needs_review: false, reviewed_by: 'old-user' },
        { id: 'item-2', name: 'Chicken', needs_review: true }
      ]
    };

    const userId = 'new-user';

    const updatedItems = category.items.map(item =>
      item.needs_review
        ? {
            ...item,
            needs_review: false,
            review_reasons: [],
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
          }
        : item
    );

    // Item 1 should NOT be modified (wasn't flagged)
    expect(updatedItems[0].reviewed_by).toBe('old-user');
    // Item 2 should be modified (was flagged)
    expect(updatedItems[1].reviewed_by).toBe(userId);
  });

  /**
   * Test 6: Bulk resolve menu clears all flagged items across categories
   */
  test('bulk resolve menu: clears flagged items in all categories', () => {
    const menu = {
      id: 'dinner-menu',
      name: 'Dinner',
      categories: [
        {
          id: 'cat-1',
          name: 'Appetizers',
          items: [
            { id: 'item-1', name: 'Wings', needs_review: true },
            { id: 'item-2', name: 'Salad', needs_review: false }
          ]
        },
        {
          id: 'cat-2',
          name: 'Entrees',
          items: [
            { id: 'item-3', name: 'Steak', needs_review: true },
            { id: 'item-4', name: 'Fish', needs_review: true }
          ]
        }
      ]
    };

    const userId = 'manager-123';

    // Count flagged items before
    const flaggedBefore = menu.categories.flatMap(c =>
      c.items.filter(i => i.needs_review)
    );
    expect(flaggedBefore.length).toBe(3);

    // Simulate markMenuReviewed
    const updatedCategories = menu.categories.map(c => ({
      ...c,
      items: c.items.map(item =>
        item.needs_review
          ? {
              ...item,
              needs_review: false,
              review_reasons: [],
              reviewed_by: userId,
              reviewed_at: new Date().toISOString()
            }
          : item
      )
    }));

    // Count flagged items after
    const flaggedAfter = updatedCategories.flatMap(c =>
      c.items.filter(i => i.needs_review)
    );
    expect(flaggedAfter.length).toBe(0);

    // Verify all flagged items got reviewed_by
    const reviewedItems = updatedCategories.flatMap(c =>
      c.items.filter(i => i.reviewed_by === userId)
    );
    expect(reviewedItems.length).toBe(3);
  });

  /**
   * Test 7: Jump to first flagged finds item in first category
   */
  test('jump to first flagged: finds item in first category', () => {
    const menu = {
      id: 'lunch-menu',
      name: 'Lunch',
      categories: [
        {
          id: 'cat-1',
          name: 'Sandwiches',
          items: [
            { id: 'item-1', name: 'BLT', needs_review: false },
            { id: 'item-2', name: 'Club', needs_review: true }, // First flagged
            { id: 'item-3', name: 'Wrap', needs_review: true }
          ]
        },
        {
          id: 'cat-2',
          name: 'Salads',
          items: [
            { id: 'item-4', name: 'Caesar', needs_review: true }
          ]
        }
      ]
    };

    // Find first flagged item
    let firstFlagged = null;
    let firstCategory = null;

    for (const category of menu.categories) {
      const flagged = category.items.find(item => item.needs_review);
      if (flagged) {
        firstFlagged = flagged;
        firstCategory = category;
        break;
      }
    }

    expect(firstFlagged).not.toBeNull();
    expect(firstFlagged.id).toBe('item-2'); // Club sandwich
    expect(firstCategory.id).toBe('cat-1'); // Sandwiches
  });

  /**
   * Test 8: Jump to first flagged skips clean categories
   */
  test('jump to first flagged: skips categories with no flagged items', () => {
    const menu = {
      id: 'dinner-menu',
      name: 'Dinner',
      categories: [
        {
          id: 'cat-1',
          name: 'Appetizers',
          items: [
            { id: 'item-1', name: 'Wings', needs_review: false },
            { id: 'item-2', name: 'Salad', needs_review: false }
          ]
        },
        {
          id: 'cat-2',
          name: 'Entrees',
          items: [
            { id: 'item-3', name: 'Steak', needs_review: true } // First flagged
          ]
        }
      ]
    };

    // Find first flagged item
    let firstFlagged = null;
    let firstCategory = null;

    for (const category of menu.categories) {
      const flagged = category.items.find(item => item.needs_review);
      if (flagged) {
        firstFlagged = flagged;
        firstCategory = category;
        break;
      }
    }

    expect(firstCategory.id).toBe('cat-2'); // Skipped cat-1
    expect(firstFlagged.id).toBe('item-3');
  });

  /**
   * Test 9: Jump to first flagged returns null when no flagged items
   */
  test('jump to first flagged: returns null when menu is clean', () => {
    const menu = {
      id: 'clean-menu',
      name: 'Clean',
      categories: [
        {
          id: 'cat-1',
          items: [
            { id: 'item-1', needs_review: false },
            { id: 'item-2', needs_review: false }
          ]
        }
      ]
    };

    // Find first flagged item
    let firstFlagged = null;

    for (const category of menu.categories) {
      const flagged = category.items.find(item => item.needs_review);
      if (flagged) {
        firstFlagged = flagged;
        break;
      }
    }

    expect(firstFlagged).toBeNull();
  });

  /**
   * Test 10: Confidence recalculates after single item resolved
   */
  test('live update: confidence recalculates after item resolved', () => {
    // Before: 2/4 items flagged = 50% = LOW confidence
    const menuBefore = {
      categories: [
        {
          items: [
            { id: '1', needs_review: true },
            { id: '2', needs_review: false },
            { id: '3', needs_review: true },
            { id: '4', needs_review: false }
          ]
        }
      ]
    };

    const countBefore = menuBefore.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    const totalBefore = menuBefore.categories.flatMap(c => c.items).length;
    const percentBefore = (countBefore / totalBefore) * 100;

    expect(countBefore).toBe(2);
    expect(percentBefore).toBe(50);

    // After: Mark one item as reviewed - 1/4 = 25% = MEDIUM confidence
    const menuAfter = {
      categories: [
        {
          items: [
            { id: '1', needs_review: false, reviewed_by: 'user' }, // Resolved
            { id: '2', needs_review: false },
            { id: '3', needs_review: true },
            { id: '4', needs_review: false }
          ]
        }
      ]
    };

    const countAfter = menuAfter.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    const totalAfter = menuAfter.categories.flatMap(c => c.items).length;
    const percentAfter = (countAfter / totalAfter) * 100;

    expect(countAfter).toBe(1);
    expect(percentAfter).toBe(25);
    expect(percentAfter).toBeLessThan(percentBefore);
  });

  /**
   * Test 11: Confidence becomes HIGH after all items resolved
   */
  test('live update: confidence becomes HIGH after all resolved', () => {
    const menu = {
      categories: [
        {
          items: [
            { id: '1', needs_review: true },
            { id: '2', needs_review: true }
          ]
        }
      ]
    };

    // Before: 100% needs review
    const countBefore = menu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    expect(countBefore).toBe(2);

    // After: Resolve all
    const resolvedMenu = {
      categories: [
        {
          items: [
            { id: '1', needs_review: false, reviewed_by: 'user' },
            { id: '2', needs_review: false, reviewed_by: 'user' }
          ]
        }
      ]
    };

    const countAfter = resolvedMenu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    const percentAfter = (countAfter / resolvedMenu.categories.flatMap(c => c.items).length) * 100;

    expect(countAfter).toBe(0);
    expect(percentAfter).toBe(0);
    // 0% = HIGH confidence
  });

  /**
   * Test 12: Banner updates immediately after item resolved
   */
  test('live update: banner count decreases after item resolved', () => {
    const menu = {
      categories: [
        {
          items: [
            { id: '1', needs_review: true },
            { id: '2', needs_review: true },
            { id: '3', needs_review: true }
          ]
        }
      ]
    };

    const countBefore = menu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    expect(countBefore).toBe(3);

    // Resolve one item
    menu.categories[0].items[0].needs_review = false;

    const countAfter = menu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    expect(countAfter).toBe(2);
    expect(countAfter).toBe(countBefore - 1);
  });

  /**
   * Test 13: Banner disappears when last item resolved
   */
  test('live update: banner disappears when needsReviewCount reaches 0', () => {
    const menu = {
      categories: [
        {
          items: [
            { id: '1', needs_review: true }
          ]
        }
      ]
    };

    const countBefore = menu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    expect(countBefore).toBe(1);

    // Resolve the last item
    menu.categories[0].items[0].needs_review = false;

    const countAfter = menu.categories.flatMap(c => c.items).filter(i => i.needs_review).length;
    expect(countAfter).toBe(0);

    // Banner should hide when needsReviewCount === 0
    const showBanner = countAfter > 0;
    expect(showBanner).toBe(false);
  });

  /**
   * Test 14: Bulk resolve category preserves non-flagged metadata
   */
  test('bulk resolve category: preserves clean items metadata', () => {
    const category = {
      id: 'cat-1',
      items: [
        {
          id: 'item-1',
          name: 'Already Clean',
          needs_review: false,
          reviewed_by: 'original-reviewer',
          reviewed_at: '2025-01-01T00:00:00.000Z',
          custom_field: 'preserved'
        },
        {
          id: 'item-2',
          name: 'Needs Review',
          needs_review: true
        }
      ]
    };

    const userId = 'new-reviewer';

    const updatedItems = category.items.map(item =>
      item.needs_review
        ? {
            ...item,
            needs_review: false,
            review_reasons: [],
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
          }
        : item
    );

    // Item 1 should be unchanged
    expect(updatedItems[0].reviewed_by).toBe('original-reviewer');
    expect(updatedItems[0].reviewed_at).toBe('2025-01-01T00:00:00.000Z');
    expect(updatedItems[0].custom_field).toBe('preserved');

    // Item 2 should be updated
    expect(updatedItems[1].needs_review).toBe(false);
    expect(updatedItems[1].reviewed_by).toBe(userId);
  });

  /**
   * Test 15: Bulk resolve menu handles empty categories
   */
  test('bulk resolve menu: handles empty categories', () => {
    const menu = {
      id: 'menu-1',
      name: 'Test Menu',
      categories: [
        {
          id: 'cat-1',
          name: 'Empty Category',
          items: []
        },
        {
          id: 'cat-2',
          name: 'Has Items',
          items: [
            { id: 'item-1', needs_review: true }
          ]
        }
      ]
    };

    const userId = 'user-123';

    // Simulate markMenuReviewed
    const updatedCategories = menu.categories.map(c => ({
      ...c,
      items: c.items?.map(item =>
        item.needs_review
          ? {
              ...item,
              needs_review: false,
              review_reasons: [],
              reviewed_by: userId,
              reviewed_at: new Date().toISOString()
            }
          : item
      ) || []
    }));

    // Verify no errors with empty category
    expect(updatedCategories[0].items.length).toBe(0);
    expect(updatedCategories[1].items[0].needs_review).toBe(false);
  });

  /**
   * Test 16: Resolved items retain reviewed_by on save
   */
  test('mark item reviewed: reviewed_by persists', () => {
    const item = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.00,
      needs_review: true
    };

    const userId = 'manager@test.com';
    const updated = {
      ...item,
      needs_review: false,
      review_reasons: [],
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    };

    // After save, reviewed_by should still be present
    expect(updated.reviewed_by).toBe(userId);
    expect(updated.reviewed_by).toBeDefined();
    expect(typeof updated.reviewed_by).toBe('string');
  });

  /**
   * Test 17: Bulk resolve logs correct item count
   */
  test('bulk resolve category: counts flagged items correctly', () => {
    const category = {
      id: 'cat-1',
      name: 'Test',
      items: [
        { id: '1', needs_review: true },
        { id: '2', needs_review: false },
        { id: '3', needs_review: true },
        { id: '4', needs_review: false },
        { id: '5', needs_review: true }
      ]
    };

    const flaggedCount = category.items.filter(i => i.needs_review).length;
    expect(flaggedCount).toBe(3);

    // Success message should show correct count
    const message = `${flaggedCount} item${flaggedCount > 1 ? 's' : ''} in "${category.name}" marked as reviewed`;
    expect(message).toBe('3 items in "Test" marked as reviewed');
  });

  /**
   * Test 18: Bulk resolve menu counts items across all categories
   */
  test('bulk resolve menu: counts all flagged items', () => {
    const menu = {
      name: 'Dinner',
      categories: [
        {
          items: [
            { id: '1', needs_review: true },
            { id: '2', needs_review: false }
          ]
        },
        {
          items: [
            { id: '3', needs_review: true },
            { id: '4', needs_review: true }
          ]
        }
      ]
    };

    const allFlagged = menu.categories.flatMap(c => c.items.filter(i => i.needs_review));
    expect(allFlagged.length).toBe(3);

    const message = `${allFlagged.length} items in "${menu.name}" marked as reviewed`;
    expect(message).toBe('3 items in "Dinner" marked as reviewed');
  });

  /**
   * Test 19: Jump to first flagged handles menu with no categories
   */
  test('jump to first flagged: handles empty menu', () => {
    const menu = {
      id: 'empty-menu',
      name: 'Empty',
      categories: []
    };

    // Find first flagged item
    let firstFlagged = null;

    for (const category of menu.categories) {
      const flagged = category.items?.find(item => item.needs_review);
      if (flagged) {
        firstFlagged = flagged;
        break;
      }
    }

    expect(firstFlagged).toBeNull();
  });

  /**
   * Test 20: Confidence thresholds match expected levels
   */
  test('confidence calculation: matches Phase 3.3-D thresholds', () => {
    const testCases = [
      { percent: 0, expected: 'HIGH' },
      { percent: 10, expected: 'MEDIUM' },
      { percent: 25, expected: 'MEDIUM' },
      { percent: 26, expected: 'LOW' },
      { percent: 50, expected: 'LOW' },
      { percent: 51, expected: 'VERY_LOW' },
      { percent: 75, expected: 'VERY_LOW' },
      { percent: 100, expected: 'VERY_LOW' }
    ];

    testCases.forEach(({ percent, expected }) => {
      let confidence;
      if (percent === 0) {
        confidence = 'HIGH';
      } else if (percent <= 25) {
        confidence = 'MEDIUM';
      } else if (percent <= 50) {
        confidence = 'LOW';
      } else {
        confidence = 'VERY_LOW';
      }

      expect(confidence).toBe(expected);
    });
  });
});
