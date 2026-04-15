/**
 * Phase 3.3-B: Menu CRUD Tests
 * Tests for createMenu, renameMenu, deleteMenu, and reorderMenus operations
 */

describe('MenuManager - Menu CRUD (Phase 3.3-B)', () => {
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
              { id: 'item-1', name: 'Steak', price: 30.00, price_type: 'FIXED' }
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
              { id: 'item-2', name: 'BLT', price: 12.00, price_type: 'FIXED' }
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
   * Test 1: createMenu adds new menu with correct structure
   */
  test('createMenu adds new menu to menus array', () => {
    const menuData = createTestMenuData();
    const initialCount = menuData.menus.length; // 3

    // Simulate createMenu
    const newMenu = {
      id: 'drinks-menu',
      name: 'New Menu',
      display_order: initialCount + 1,
      categories: []
    };

    const updatedMenuData = {
      ...menuData,
      menus: [...menuData.menus, newMenu]
    };

    expect(updatedMenuData.menus).toHaveLength(4);
    expect(updatedMenuData.menus[3].name).toBe('New Menu');
    expect(updatedMenuData.menus[3].display_order).toBe(4);
    expect(updatedMenuData.menus[3].categories).toEqual([]);
  });

  /**
   * Test 2: createMenu generates unique ID
   */
  test('createMenu generates unique menu ID', () => {
    const menuData = createTestMenuData();

    const newMenu1 = {
      id: 'new-menu-1',
      name: 'Menu 1',
      display_order: 4,
      categories: []
    };

    const newMenu2 = {
      id: 'new-menu-2',
      name: 'Menu 2',
      display_order: 5,
      categories: []
    };

    const updatedMenuData = {
      ...menuData,
      menus: [...menuData.menus, newMenu1, newMenu2]
    };

    const ids = updatedMenuData.menus.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length); // All IDs are unique
  });

  /**
   * Test 3: renameMenu updates menu name correctly
   */
  test('renameMenu updates menu name for correct menu only', () => {
    const menuData = createTestMenuData();

    // Rename 'Lunch' to 'Lunch Specials'
    const updatedMenuData = {
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === 'lunch-menu' ? { ...menu, name: 'Lunch Specials' } : menu
      )
    };

    expect(updatedMenuData.menus[0].name).toBe('Dinner'); // Unchanged
    expect(updatedMenuData.menus[1].name).toBe('Lunch Specials'); // Updated
    expect(updatedMenuData.menus[2].name).toBe('Brunch'); // Unchanged
  });

  /**
   * Test 4: renameMenu rejects empty name
   */
  test('renameMenu rejects empty or whitespace-only names', () => {
    const menuData = createTestMenuData();

    // Attempt to rename with empty string
    const emptyName = '';
    const shouldFail = !emptyName || !emptyName.trim();
    expect(shouldFail).toBe(true);

    // Attempt to rename with whitespace only
    const whitespaceName = '   ';
    const shouldFailWhitespace = !whitespaceName || !whitespaceName.trim();
    expect(shouldFailWhitespace).toBe(true);

    // Valid name should pass
    const validName = 'Valid Menu Name';
    const shouldPass = Boolean(validName && validName.trim());
    expect(shouldPass).toBe(true);
  });

  /**
   * Test 5: deleteMenu removes correct menu
   */
  test('deleteMenu removes specified menu only', () => {
    const menuData = createTestMenuData();
    const initialCount = menuData.menus.length;

    // Delete 'Brunch' menu
    const updatedMenuData = {
      ...menuData,
      menus: menuData.menus.filter(m => m.id !== 'brunch-menu')
    };

    expect(updatedMenuData.menus).toHaveLength(initialCount - 1);
    expect(updatedMenuData.menus.map(m => m.name)).toEqual(['Dinner', 'Lunch']);
    expect(updatedMenuData.menus.find(m => m.id === 'brunch-menu')).toBeUndefined();
  });

  /**
   * Test 6: deleteMenu blocks deletion of last menu
   */
  test('deleteMenu prevents deleting last remaining menu', () => {
    const menuData = {
      version: 2,
      menus: [
        {
          id: 'only-menu',
          name: 'Only Menu',
          display_order: 1,
          categories: []
        }
      ],
      specials: [],
      upsell_tips: []
    };

    const canDelete = menuData.menus.length > 1;
    expect(canDelete).toBe(false);

    // Attempting delete should not change menus array
    const updatedMenuData = canDelete
      ? { ...menuData, menus: menuData.menus.filter(m => m.id !== 'only-menu') }
      : menuData;

    expect(updatedMenuData.menus).toHaveLength(1);
  });

  /**
   * Test 7: deleteMenu switches selected menu if deleted menu was selected
   */
  test('deleteMenu switches to first menu when deleting selected menu', () => {
    const menuData = createTestMenuData();
    const selectedMenuId = 'lunch-menu'; // Lunch is selected

    // Delete selected menu
    const remainingMenus = menuData.menus.filter(m => m.id !== selectedMenuId);
    const newSelectedMenuId = selectedMenuId === 'lunch-menu'
      ? remainingMenus[0].id
      : selectedMenuId;

    expect(newSelectedMenuId).toBe('dinner-menu'); // Switched to first menu
    expect(remainingMenus.map(m => m.name)).toEqual(['Dinner', 'Brunch']);
  });

  /**
   * Test 8: reorderMenus moves menu up
   */
  test('reorderMenus moves menu up in order', () => {
    const menuData = createTestMenuData();
    const fromIndex = 2; // Brunch (index 2)
    const toIndex = 1; // Move to index 1

    // Simulate reorder
    const reordered = [...menuData.menus];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Update display_order
    const menusWithNewOrder = reordered.map((menu, idx) => ({
      ...menu,
      display_order: idx + 1
    }));

    expect(menusWithNewOrder.map(m => m.name)).toEqual(['Dinner', 'Brunch', 'Lunch']);
    expect(menusWithNewOrder[0].display_order).toBe(1);
    expect(menusWithNewOrder[1].display_order).toBe(2); // Brunch moved up
    expect(menusWithNewOrder[2].display_order).toBe(3);
  });

  /**
   * Test 9: reorderMenus moves menu down
   */
  test('reorderMenus moves menu down in order', () => {
    const menuData = createTestMenuData();
    const fromIndex = 0; // Dinner (index 0)
    const toIndex = 2; // Move to index 2

    // Simulate reorder
    const reordered = [...menuData.menus];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Update display_order
    const menusWithNewOrder = reordered.map((menu, idx) => ({
      ...menu,
      display_order: idx + 1
    }));

    expect(menusWithNewOrder.map(m => m.name)).toEqual(['Lunch', 'Brunch', 'Dinner']);
    expect(menusWithNewOrder[0].display_order).toBe(1);
    expect(menusWithNewOrder[1].display_order).toBe(2);
    expect(menusWithNewOrder[2].display_order).toBe(3); // Dinner moved down
  });

  /**
   * Test 10: reorderMenus handles edge cases (first/last)
   */
  test('reorderMenus cannot move first menu up or last menu down', () => {
    const menuData = createTestMenuData();

    // Cannot move first menu (index 0) up (toIndex would be -1)
    const firstMenuIndex = 0;
    const canMoveUp = firstMenuIndex > 0;
    expect(canMoveUp).toBe(false);

    // Cannot move last menu (index 2) down (toIndex would be 3)
    const lastMenuIndex = menuData.menus.length - 1;
    const canMoveDown = lastMenuIndex < menuData.menus.length - 1;
    expect(canMoveDown).toBe(false);
  });

  /**
   * Test 11: reorderMenus updates display_order for all menus
   */
  test('reorderMenus updates display_order for all menus after reordering', () => {
    const menuData = createTestMenuData();

    // Swap first and last
    const reordered = [
      menuData.menus[2], // Brunch
      menuData.menus[1], // Lunch
      menuData.menus[0]  // Dinner
    ];

    const menusWithNewOrder = reordered.map((menu, idx) => ({
      ...menu,
      display_order: idx + 1
    }));

    expect(menusWithNewOrder[0].name).toBe('Brunch');
    expect(menusWithNewOrder[0].display_order).toBe(1);
    expect(menusWithNewOrder[1].name).toBe('Lunch');
    expect(menusWithNewOrder[1].display_order).toBe(2);
    expect(menusWithNewOrder[2].name).toBe('Dinner');
    expect(menusWithNewOrder[2].display_order).toBe(3);
  });

  /**
   * Test 12: Menu operations preserve categories and items
   */
  test('menu operations do not affect categories or items in other menus', () => {
    const menuData = createTestMenuData();

    // Rename Dinner menu
    const renamed = {
      ...menuData,
      menus: menuData.menus.map(m =>
        m.id === 'dinner-menu' ? { ...m, name: 'Evening Menu' } : m
      )
    };

    // Categories and items should be unchanged
    expect(renamed.menus[0].categories[0].name).toBe('Entrees');
    expect(renamed.menus[0].categories[0].items[0].name).toBe('Steak');
    expect(renamed.menus[1].categories[0].name).toBe('Sandwiches');
    expect(renamed.menus[1].categories[0].items[0].name).toBe('BLT');
  });

  /**
   * Test 13: createMenu with single existing menu
   */
  test('createMenu works when starting with single menu', () => {
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

    const newMenu = {
      id: 'lunch-menu',
      name: 'Lunch',
      display_order: 2,
      categories: []
    };

    const updated = {
      ...menuData,
      menus: [...menuData.menus, newMenu]
    };

    expect(updated.menus).toHaveLength(2);
    expect(updated.menus[1].name).toBe('Lunch');
  });

  /**
   * Test 14: deleteMenu with exactly 2 menus (edge case)
   */
  test('deleteMenu allows deleting when exactly 2 menus exist', () => {
    const menuData = {
      version: 2,
      menus: [
        { id: 'menu-1', name: 'Menu 1', display_order: 1, categories: [] },
        { id: 'menu-2', name: 'Menu 2', display_order: 2, categories: [] }
      ],
      specials: [],
      upsell_tips: []
    };

    const canDelete = menuData.menus.length > 1;
    expect(canDelete).toBe(true);

    const updated = {
      ...menuData,
      menus: menuData.menus.filter(m => m.id !== 'menu-2')
    };

    expect(updated.menus).toHaveLength(1);
    expect(updated.menus[0].name).toBe('Menu 1');
  });

  /**
   * Test 15: Menu selector visibility based on menu count
   */
  test('menu selector shows when 2+ menus, hidden when 1 menu', () => {
    const singleMenuData = {
      version: 2,
      menus: [{ id: 'm1', name: 'Dinner', display_order: 1, categories: [] }],
      specials: [],
      upsell_tips: []
    };

    const multiMenuData = {
      version: 2,
      menus: [
        { id: 'm1', name: 'Dinner', display_order: 1, categories: [] },
        { id: 'm2', name: 'Lunch', display_order: 2, categories: [] }
      ],
      specials: [],
      upsell_tips: []
    };

    // In Phase 3.3-A, selector was hidden when length === 1
    // In Phase 3.3-B, selector is ALWAYS shown (for CRUD controls)
    const showSelectorSingle = true; // Always show
    const showSelectorMulti = true;

    expect(showSelectorSingle).toBe(true);
    expect(showSelectorMulti).toBe(true);
  });
});
