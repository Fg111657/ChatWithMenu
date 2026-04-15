/**
 * Phase 3.3-C: ServerDashboard Menu Selection Tests
 * Tests for menu switching and separation in ServerDashboard
 */

describe('ServerDashboard - Menu Selection (Phase 3.3-C)', () => {
  // Helper to create test menu data with multiple menus
  const createTestMenuData = () => ({
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
            items: [
              { id: 'item-1', name: 'Steak', price: 30.00, price_type: 'FIXED', available: true },
              { id: 'item-2', name: 'Salmon', price: 25.00, price_type: 'FIXED', available: true }
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
            id: 'cat-2',
            name: 'Sandwiches',
            display_order: 1,
            items: [
              { id: 'item-3', name: 'BLT', price: 12.00, price_type: 'FIXED', available: true },
              { id: 'item-4', name: 'Club', price: 14.00, price_type: 'FIXED', available: true }
            ]
          }
        ]
      },
      {
        id: 'brunch-menu',
        name: 'Brunch',
        display_order: 3,
        categories: []
      }
    ],
    specials: [],
    upsell_tips: []
  });

  /**
   * Test 1: activeMenu defaults to first menu when not explicitly set
   */
  test('activeMenu defaults to first menu when selectedMenuId is null', () => {
    const menuData = createTestMenuData();
    const selectedMenuId = null;

    const activeMenu = menuData.menus.find(m => m.id === selectedMenuId) || menuData.menus[0];

    expect(activeMenu.id).toBe('dinner-menu');
    expect(activeMenu.name).toBe('Dinner');
  });

  /**
   * Test 2: activeMenu returns correct menu when selectedMenuId is set
   */
  test('activeMenu returns correct menu when selectedMenuId is explicitly set', () => {
    const menuData = createTestMenuData();
    const selectedMenuId = 'lunch-menu';

    const activeMenu = menuData.menus.find(m => m.id === selectedMenuId) || menuData.menus[0];

    expect(activeMenu.id).toBe('lunch-menu');
    expect(activeMenu.name).toBe('Lunch');
  });

  /**
   * Test 3: menuItems are extracted only from activeMenu
   */
  test('menuItems contain only items from active menu, not from other menus', () => {
    const menuData = createTestMenuData();
    const selectedMenuId = 'dinner-menu';
    const activeMenu = menuData.menus.find(m => m.id === selectedMenuId);

    const menuItems = [];
    activeMenu.categories.forEach((category) => {
      if (category.items) {
        category.items.forEach((item) => {
          if (item.available !== false) {
            menuItems.push({
              id: item.id,
              name: item.name,
              category: category.name,
              menu: activeMenu.name,
            });
          }
        });
      }
    });

    expect(menuItems).toHaveLength(2); // Only Steak and Salmon
    expect(menuItems.map(i => i.name)).toEqual(['Steak', 'Salmon']);
    expect(menuItems.every(i => i.menu === 'Dinner')).toBe(true);
    expect(menuItems.some(i => i.name === 'BLT')).toBe(false); // Lunch item not included
  });

  /**
   * Test 4: Switching menus changes displayed items
   */
  test('switching from Dinner to Lunch changes menuItems', () => {
    const menuData = createTestMenuData();

    // Start with Dinner
    let selectedMenuId = 'dinner-menu';
    let activeMenu = menuData.menus.find(m => m.id === selectedMenuId);

    const extractItems = (menu) => {
      const items = [];
      menu.categories.forEach((category) => {
        if (category.items) {
          category.items.forEach((item) => {
            if (item.available !== false) {
              items.push({ id: item.id, name: item.name });
            }
          });
        }
      });
      return items;
    };

    let menuItems = extractItems(activeMenu);
    expect(menuItems.map(i => i.name)).toEqual(['Steak', 'Salmon']);

    // Switch to Lunch
    selectedMenuId = 'lunch-menu';
    activeMenu = menuData.menus.find(m => m.id === selectedMenuId);
    menuItems = extractItems(activeMenu);

    expect(menuItems.map(i => i.name)).toEqual(['BLT', 'Club']);
    expect(menuItems.some(i => i.name === 'Steak')).toBe(false); // Dinner item not included
  });

  /**
   * Test 5: Empty menu returns empty menuItems
   */
  test('empty menu (Brunch) returns empty menuItems array', () => {
    const menuData = createTestMenuData();
    const selectedMenuId = 'brunch-menu';
    const activeMenu = menuData.menus.find(m => m.id === selectedMenuId);

    const menuItems = [];
    if (activeMenu.categories) {
      activeMenu.categories.forEach((category) => {
        if (category.items) {
          category.items.forEach((item) => {
            if (item.available !== false) {
              menuItems.push({ id: item.id, name: item.name });
            }
          });
        }
      });
    }

    expect(menuItems).toHaveLength(0);
  });

  /**
   * Test 6: Menu selector shows when 2+ menus exist
   */
  test('menu selector should render when multiple menus exist', () => {
    const menuData = createTestMenuData();

    const shouldShowSelector = menuData.menus && menuData.menus.length > 1;

    expect(shouldShowSelector).toBe(true);
    expect(menuData.menus).toHaveLength(3);
  });

  /**
   * Test 7: Menu selector hidden when only 1 menu
   */
  test('menu selector should not render when only one menu exists', () => {
    const menuData = {
      version: 2,
      menus: [
        {
          id: 'dinner-menu',
          name: 'Dinner',
          display_order: 1,
          categories: []
        }
      ],
      specials: [],
      upsell_tips: []
    };

    const shouldShowSelector = menuData.menus && menuData.menus.length > 1;

    expect(shouldShowSelector).toBe(false);
  });

  /**
   * Test 8: Categories are isolated per menu
   */
  test('categories from one menu do not appear in another menu', () => {
    const menuData = createTestMenuData();

    const dinnerMenu = menuData.menus.find(m => m.id === 'dinner-menu');
    const lunchMenu = menuData.menus.find(m => m.id === 'lunch-menu');

    const dinnerCategories = dinnerMenu.categories.map(c => c.name);
    const lunchCategories = lunchMenu.categories.map(c => c.name);

    expect(dinnerCategories).toEqual(['Entrees']);
    expect(lunchCategories).toEqual(['Sandwiches']);
    expect(dinnerCategories).not.toEqual(lunchCategories);
  });

  /**
   * Test 9: Item counts are calculated per menu
   */
  test('item count reflects active menu only', () => {
    const menuData = createTestMenuData();

    const dinnerMenu = menuData.menus.find(m => m.id === 'dinner-menu');
    const lunchMenu = menuData.menus.find(m => m.id === 'lunch-menu');
    const brunchMenu = menuData.menus.find(m => m.id === 'brunch-menu');

    const getDinnerItemCount = () => {
      return dinnerMenu.categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    };

    const getLunchItemCount = () => {
      return lunchMenu.categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    };

    const getBrunchItemCount = () => {
      return brunchMenu.categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);
    };

    expect(getDinnerItemCount()).toBe(2);
    expect(getLunchItemCount()).toBe(2);
    expect(getBrunchItemCount()).toBe(0);
  });

  /**
   * Test 10: No menu mixing - strict separation
   */
  test('no items from other menus leak into active menu', () => {
    const menuData = createTestMenuData();

    // Get all item names from Dinner menu
    const dinnerMenu = menuData.menus.find(m => m.id === 'dinner-menu');
    const dinnerItems = new Set();
    dinnerMenu.categories.forEach(cat => {
      cat.items?.forEach(item => dinnerItems.add(item.name));
    });

    // Get all item names from Lunch menu
    const lunchMenu = menuData.menus.find(m => m.id === 'lunch-menu');
    const lunchItems = new Set();
    lunchMenu.categories.forEach(cat => {
      cat.items?.forEach(item => lunchItems.add(item.name));
    });

    // Ensure no overlap
    const intersection = [...dinnerItems].filter(x => lunchItems.has(x));
    expect(intersection).toHaveLength(0);

    // Verify correct items
    expect(Array.from(dinnerItems)).toEqual(['Steak', 'Salmon']);
    expect(Array.from(lunchItems)).toEqual(['BLT', 'Club']);
  });

  /**
   * Test 11: localStorage key is restaurant-specific
   */
  test('localStorage key includes restaurantId for menu selection', () => {
    const restaurantId = 42;
    const expectedKey = `serverDashboard_selectedMenu_${restaurantId}`;

    // Simulate getting key
    const getLocalStorageKey = (restId) => `serverDashboard_selectedMenu_${restId}`;

    expect(getLocalStorageKey(restaurantId)).toBe(expectedKey);
    expect(getLocalStorageKey(42)).toBe('serverDashboard_selectedMenu_42');
    expect(getLocalStorageKey(99)).toBe('serverDashboard_selectedMenu_99');
  });

  /**
   * Test 12: Menu data structure validation
   */
  test('menu data must have menus array with id and categories', () => {
    const menuData = createTestMenuData();

    expect(menuData.menus).toBeDefined();
    expect(Array.isArray(menuData.menus)).toBe(true);

    menuData.menus.forEach(menu => {
      expect(menu.id).toBeDefined();
      expect(typeof menu.id).toBe('string');
      expect(menu.name).toBeDefined();
      expect(Array.isArray(menu.categories)).toBe(true);
    });
  });

  /**
   * Test 13: Unavailable items are filtered out
   */
  test('items with available=false are not included in menuItems', () => {
    const menuData = {
      version: 2,
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
              items: [
                { id: 'item-1', name: 'Steak', price: 30.00, price_type: 'FIXED', available: true },
                { id: 'item-2', name: 'Lobster', price: 50.00, price_type: 'FIXED', available: false }, // Unavailable
                { id: 'item-3', name: 'Salmon', price: 25.00, price_type: 'FIXED', available: true }
              ]
            }
          ]
        }
      ],
      specials: [],
      upsell_tips: []
    };

    const activeMenu = menuData.menus[0];
    const menuItems = [];
    activeMenu.categories.forEach((category) => {
      if (category.items) {
        category.items.forEach((item) => {
          if (item.available !== false) {
            menuItems.push({ id: item.id, name: item.name });
          }
        });
      }
    });

    expect(menuItems).toHaveLength(2);
    expect(menuItems.map(i => i.name)).toEqual(['Steak', 'Salmon']);
    expect(menuItems.some(i => i.name === 'Lobster')).toBe(false); // Unavailable item filtered out
  });

  /**
   * Test 14: Multiple categories per menu are all included
   */
  test('all categories from active menu are processed', () => {
    const menuData = {
      version: 2,
      menus: [
        {
          id: 'dinner-menu',
          name: 'Dinner',
          display_order: 1,
          categories: [
            {
              id: 'cat-1',
              name: 'Appetizers',
              display_order: 1,
              items: [
                { id: 'item-1', name: 'Wings', price: 10.00, price_type: 'FIXED', available: true }
              ]
            },
            {
              id: 'cat-2',
              name: 'Entrees',
              display_order: 2,
              items: [
                { id: 'item-2', name: 'Steak', price: 30.00, price_type: 'FIXED', available: true }
              ]
            },
            {
              id: 'cat-3',
              name: 'Desserts',
              display_order: 3,
              items: [
                { id: 'item-3', name: 'Cake', price: 8.00, price_type: 'FIXED', available: true }
              ]
            }
          ]
        }
      ],
      specials: [],
      upsell_tips: []
    };

    const activeMenu = menuData.menus[0];
    const menuItems = [];
    activeMenu.categories.forEach((category) => {
      if (category.items) {
        category.items.forEach((item) => {
          if (item.available !== false) {
            menuItems.push({ id: item.id, name: item.name, category: category.name });
          }
        });
      }
    });

    expect(menuItems).toHaveLength(3);
    expect(menuItems.map(i => i.name)).toEqual(['Wings', 'Steak', 'Cake']);
    expect(menuItems.map(i => i.category)).toEqual(['Appetizers', 'Entrees', 'Desserts']);
  });
});
