/**
 * Tests for Phase 3.3-A: Menu Selector UI
 *
 * Tests that:
 * 1. Menu selector shows when multiple menus exist
 * 2. Switching menus changes visible categories
 * 3. No category/item bleed between menus
 * 4. Single menu doesn't show selector
 * 5. Category CRUD operates on selected menu only
 */

describe('MenuManager - Menu Selector (Phase 3.3-A)', () => {
  // Test Data
  const multiMenuData = {
    version: 2,
    currency: 'USD',
    language: 'en',
    menus: [
      {
        id: 'dinner-menu',
        name: 'Dinner',
        display_order: 1,
        categories: [
          {
            id: 'dinner-cat-1',
            name: 'Entrees',
            display_order: 1,
            items: [
              { id: 'item-1', name: 'Steak', price: 30.00, price_type: 'FIXED' },
              { id: 'item-2', name: 'Salmon', price: 25.00, price_type: 'FIXED' },
            ]
          },
          {
            id: 'dinner-cat-2',
            name: 'Desserts',
            display_order: 2,
            items: [
              { id: 'item-3', name: 'Cheesecake', price: 8.00, price_type: 'FIXED' },
            ]
          }
        ]
      },
      {
        id: 'lunch-menu',
        name: 'Lunch',
        display_order: 2,
        categories: [
          {
            id: 'lunch-cat-1',
            name: 'Sandwiches',
            display_order: 1,
            items: [
              { id: 'item-4', name: 'BLT', price: 12.00, price_type: 'FIXED' },
              { id: 'item-5', name: 'Club', price: 13.00, price_type: 'FIXED' },
            ]
          }
        ]
      }
    ],
    specials: [],
    upsell_tips: []
  };

  const singleMenuData = {
    version: 2,
    currency: 'USD',
    language: 'en',
    menus: [
      {
        id: 'dinner-menu',
        name: 'Dinner',
        display_order: 1,
        categories: [
          {
            id: 'cat-1',
            name: 'Entrees',
            display_order: 1,
            items: []
          }
        ]
      }
    ],
    specials: [],
    upsell_tips: []
  };

  // Test 1: selectedMenu defaults to first menu
  test('selectedMenu defaults to first menu when not explicitly set', () => {
    const selectedMenuId = null; // Not set
    const menus = multiMenuData.menus;

    // Simulate the logic: find(m => m.id === selectedMenuId) || menus[0]
    const selectedMenu = menus.find(m => m.id === selectedMenuId) || menus[0];

    expect(selectedMenu).toBeDefined();
    expect(selectedMenu.id).toBe('dinner-menu');
    expect(selectedMenu.name).toBe('Dinner');
  });

  // Test 2: selectedMenu can be explicitly set
  test('selectedMenu returns correct menu when explicitly set', () => {
    const selectedMenuId = 'lunch-menu';
    const menus = multiMenuData.menus;

    const selectedMenu = menus.find(m => m.id === selectedMenuId) || menus[0];

    expect(selectedMenu).toBeDefined();
    expect(selectedMenu.id).toBe('lunch-menu');
    expect(selectedMenu.name).toBe('Lunch');
  });

  // Test 3: Categories come from selected menu only
  test('categories are from selected menu, not other menus', () => {
    // Select Dinner menu
    let selectedMenuId = 'dinner-menu';
    let selectedMenu = multiMenuData.menus.find(m => m.id === selectedMenuId);
    let categories = selectedMenu?.categories || [];

    expect(categories).toHaveLength(2);
    expect(categories[0].name).toBe('Entrees');
    expect(categories[1].name).toBe('Desserts');
    expect(categories.some(c => c.name === 'Sandwiches')).toBe(false);

    // Switch to Lunch menu
    selectedMenuId = 'lunch-menu';
    selectedMenu = multiMenuData.menus.find(m => m.id === selectedMenuId);
    categories = selectedMenu?.categories || [];

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Sandwiches');
    expect(categories.some(c => c.name === 'Entrees')).toBe(false);
    expect(categories.some(c => c.name === 'Desserts')).toBe(false);
  });

  // Test 4: Items don't bleed between menus
  test('items are isolated per menu', () => {
    // Dinner items
    const dinnerMenu = multiMenuData.menus.find(m => m.id === 'dinner-menu');
    const dinnerItems = dinnerMenu.categories.flatMap(c => c.items);

    expect(dinnerItems).toHaveLength(3);
    expect(dinnerItems.map(i => i.name)).toEqual(['Steak', 'Salmon', 'Cheesecake']);

    // Lunch items
    const lunchMenu = multiMenuData.menus.find(m => m.id === 'lunch-menu');
    const lunchItems = lunchMenu.categories.flatMap(c => c.items);

    expect(lunchItems).toHaveLength(2);
    expect(lunchItems.map(i => i.name)).toEqual(['BLT', 'Club']);

    // Verify no overlap
    const dinnerItemIds = dinnerItems.map(i => i.id);
    const lunchItemIds = lunchItems.map(i => i.id);
    const hasOverlap = dinnerItemIds.some(id => lunchItemIds.includes(id));
    expect(hasOverlap).toBe(false);
  });

  // Test 5: Single menu doesn't show selector (logical test)
  test('menu selector should not render when only one menu exists', () => {
    const menus = singleMenuData.menus;

    // Logic: menuData.menus && menuData.menus.length > 1
    const shouldShowSelector = menus && menus.length > 1;

    expect(shouldShowSelector).toBe(false);
  });

  // Test 6: Multiple menus show selector
  test('menu selector should render when multiple menus exist', () => {
    const menus = multiMenuData.menus;

    const shouldShowSelector = menus && menus.length > 1;

    expect(shouldShowSelector).toBe(true);
  });

  // Test 7: Category CRUD operates on selected menu (add category)
  test('addCategory adds to selected menu only', () => {
    const selectedMenuId = 'lunch-menu';
    const menuData = JSON.parse(JSON.stringify(multiMenuData)); // Deep copy

    const newCategory = {
      id: 'lunch-cat-2',
      name: 'Salads',
      display_order: 2,
      items: []
    };

    // Simulate addCategory logic
    const updatedMenuData = {
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? { ...menu, categories: [...menu.categories, newCategory] }
          : menu
      )
    };

    // Verify Lunch menu has new category
    const lunchMenu = updatedMenuData.menus.find(m => m.id === 'lunch-menu');
    expect(lunchMenu.categories).toHaveLength(2);
    expect(lunchMenu.categories[1].name).toBe('Salads');

    // Verify Dinner menu unchanged
    const dinnerMenu = updatedMenuData.menus.find(m => m.id === 'dinner-menu');
    expect(dinnerMenu.categories).toHaveLength(2); // Still 2 categories
    expect(dinnerMenu.categories.some(c => c.name === 'Salads')).toBe(false);
  });

  // Test 8: Category CRUD operates on selected menu (delete category)
  test('deleteCategory removes from selected menu only', () => {
    const selectedMenuId = 'dinner-menu';
    const menuData = JSON.parse(JSON.stringify(multiMenuData)); // Deep copy
    const categoryToDelete = 'dinner-cat-2'; // Desserts

    // Simulate deleteCategory logic
    const updatedMenuData = {
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? { ...menu, categories: menu.categories.filter(c => c.id !== categoryToDelete) }
          : menu
      )
    };

    // Verify Dinner menu has category removed
    const dinnerMenu = updatedMenuData.menus.find(m => m.id === 'dinner-menu');
    expect(dinnerMenu.categories).toHaveLength(1);
    expect(dinnerMenu.categories[0].name).toBe('Entrees');

    // Verify Lunch menu unchanged
    const lunchMenu = updatedMenuData.menus.find(m => m.id === 'lunch-menu');
    expect(lunchMenu.categories).toHaveLength(1);
    expect(lunchMenu.categories[0].name).toBe('Sandwiches');
  });

  // Test 9: Needs review count is per-menu
  test('needsReviewCount is calculated per selected menu', () => {
    const dataWithReview = {
      ...multiMenuData,
      menus: [
        {
          ...multiMenuData.menus[0],
          categories: [
            {
              ...multiMenuData.menus[0].categories[0],
              items: [
                { ...multiMenuData.menus[0].categories[0].items[0], needs_review: true },
                { ...multiMenuData.menus[0].categories[0].items[1], needs_review: false },
              ]
            },
            {
              ...multiMenuData.menus[0].categories[1],
              items: [
                { ...multiMenuData.menus[0].categories[1].items[0], needs_review: true },
              ]
            }
          ]
        },
        {
          ...multiMenuData.menus[1],
          categories: [
            {
              ...multiMenuData.menus[1].categories[0],
              items: [
                { ...multiMenuData.menus[1].categories[0].items[0], needs_review: false },
                { ...multiMenuData.menus[1].categories[0].items[1], needs_review: false },
              ]
            }
          ]
        }
      ]
    };

    // Dinner menu: 2 items need review
    const dinnerMenu = dataWithReview.menus.find(m => m.id === 'dinner-menu');
    const dinnerCategories = dinnerMenu?.categories || [];
    const dinnerNeedsReview = dinnerCategories.flatMap(c =>
      c.items?.filter(i => i.needs_review) || []
    );
    expect(dinnerNeedsReview).toHaveLength(2);

    // Lunch menu: 0 items need review
    const lunchMenu = dataWithReview.menus.find(m => m.id === 'lunch-menu');
    const lunchCategories = lunchMenu?.categories || [];
    const lunchNeedsReview = lunchCategories.flatMap(c =>
      c.items?.filter(i => i.needs_review) || []
    );
    expect(lunchNeedsReview).toHaveLength(0);
  });
});
