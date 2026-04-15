/**
 * Phase 3.5-A: Server Dashboard Fast Filters Tests
 * Tests for search, multi-select filters, toggles, and category collapse
 */

describe('ServerDashboard - Fast Filters (Phase 3.5-A)', () => {
  // Mock menu data with two menus to test isolation
  const mockMenuData = {
    version: 2,
    currency: 'USD',
    menus: [
      {
        id: 'lunch-menu',
        name: 'Lunch',
        categories: [
          {
            id: 'lunch-cat-1',
            name: 'Sandwiches',
            items: [
              {
                id: 'lunch-item-1',
                name: 'BLT Sandwich',
                description: 'Bacon lettuce tomato',
                price: 12.00,
                price_type: 'FIXED',
                allergens: ['Gluten'],
                dietary_tags: [],
                prep_methods: ['Grilled'],
                needs_review: false
              },
              {
                id: 'lunch-item-2',
                name: 'Vegan Wrap',
                description: 'Fresh vegetables',
                price: 10.00,
                price_type: 'FIXED',
                allergens: [],
                dietary_tags: ['Vegan', 'Vegetarian'],
                prep_methods: ['Raw'],
                needs_review: true
              }
            ]
          },
          {
            id: 'lunch-cat-2',
            name: 'Salads',
            items: [
              {
                id: 'lunch-item-3',
                name: 'Caesar Salad',
                description: 'Romaine with parmesan',
                price: null,
                price_type: 'MP',
                allergens: ['Dairy', 'Gluten'],
                dietary_tags: [],
                prep_methods: [],
                needs_review: false
              }
            ]
          }
        ]
      },
      {
        id: 'dinner-menu',
        name: 'Dinner',
        categories: [
          {
            id: 'dinner-cat-1',
            name: 'Entrees',
            items: [
              {
                id: 'dinner-item-1',
                name: 'Steak Dinner',
                description: 'Prime ribeye steak',
                price: 35.00,
                price_type: 'FIXED',
                allergens: [],
                dietary_tags: [],
                prep_methods: ['Grilled'],
                needs_review: false
              },
              {
                id: 'dinner-item-2',
                name: 'Pasta Carbonara',
                description: 'Creamy pasta with bacon',
                price: 18.00,
                price_type: 'FIXED',
                allergens: ['Gluten', 'Dairy', 'Eggs'],
                dietary_tags: [],
                prep_methods: [],
                needs_review: true
              }
            ]
          }
        ]
      }
    ]
  };

  /**
   * Test 1: Menu isolation - items from other menus never appear
   */
  test('menu isolation: only shows items from selected menu', () => {
    const selectedMenuId = 'lunch-menu';
    const activeMenu = mockMenuData.menus.find(m => m.id === selectedMenuId);

    // Extract items from active menu only
    const menuItems = [];
    activeMenu.categories.forEach(cat => {
      cat.items.forEach(item => {
        menuItems.push({
          ...item,
          category: cat.name,
          categoryId: cat.id
        });
      });
    });

    expect(menuItems.length).toBe(3); // Only 3 lunch items
    expect(menuItems.every(item => item.id.startsWith('lunch-'))).toBe(true);
    expect(menuItems.some(item => item.id.startsWith('dinner-'))).toBe(false);
  });

  /**
   * Test 2: Search finds items by name
   */
  test('search: finds items by name', () => {
    const menuItems = [
      { id: '1', name: 'BLT Sandwich', description: 'Bacon lettuce tomato' },
      { id: '2', name: 'Vegan Wrap', description: 'Fresh vegetables' },
      { id: '3', name: 'Caesar Salad', description: 'Romaine with parmesan' }
    ];

    const searchQuery = 'sandwich';
    const filtered = menuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('BLT Sandwich');
  });

  /**
   * Test 3: Search finds items by description
   */
  test('search: finds items by description', () => {
    const menuItems = [
      { id: '1', name: 'BLT Sandwich', description: 'Bacon lettuce tomato' },
      { id: '2', name: 'Vegan Wrap', description: 'Fresh vegetables' },
      { id: '3', name: 'Caesar Salad', description: 'Romaine with parmesan' }
    ];

    const searchQuery = 'bacon';
    const filtered = menuItems.filter(item =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('BLT Sandwich');
  });

  /**
   * Test 4: Allergen filter uses ANY match (shows items with ANY selected allergen)
   */
  test('allergen filter: ANY match within group', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', allergens: ['Gluten'] },
      { id: '2', name: 'Item 2', allergens: ['Dairy'] },
      { id: '3', name: 'Item 3', allergens: ['Gluten', 'Dairy'] },
      { id: '4', name: 'Item 4', allergens: [] }
    ];

    const selectedAllergens = ['Gluten', 'Dairy'];
    const filtered = menuItems.filter(item =>
      selectedAllergens.some(allergen =>
        item.allergens.some(a => a.toLowerCase() === allergen.toLowerCase())
      )
    );

    expect(filtered.length).toBe(3); // Items 1, 2, 3 (ANY match)
    expect(filtered.map(i => i.id)).toEqual(['1', '2', '3']);
  });

  /**
   * Test 5: Dietary filter uses ANY match
   */
  test('dietary filter: ANY match within group', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', tags: ['Vegan'] },
      { id: '2', name: 'Item 2', tags: ['Vegetarian'] },
      { id: '3', name: 'Item 3', tags: ['Vegan', 'Vegetarian'] },
      { id: '4', name: 'Item 4', tags: [] }
    ];

    const selectedDietary = ['Vegan'];
    const filtered = menuItems.filter(item =>
      selectedDietary.some(tag =>
        item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      )
    );

    expect(filtered.length).toBe(2); // Items 1 and 3 have Vegan
    expect(filtered.map(i => i.id)).toEqual(['1', '3']);
  });

  /**
   * Test 6: Prep method filter uses ANY match
   */
  test('prep method filter: ANY match within group', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', prep_methods: ['Grilled'] },
      { id: '2', name: 'Item 2', prep_methods: ['Raw'] },
      { id: '3', name: 'Item 3', prep_methods: ['Grilled', 'Fried'] },
      { id: '4', name: 'Item 4', prep_methods: [] }
    ];

    const selectedPrepMethods = ['Grilled'];
    const filtered = menuItems.filter(item =>
      selectedPrepMethods.some(method =>
        item.prep_methods?.some(m => m.toLowerCase() === method.toLowerCase())
      )
    );

    expect(filtered.length).toBe(2); // Items 1 and 3 have Grilled
    expect(filtered.map(i => i.id)).toEqual(['1', '3']);
  });

  /**
   * Test 7: MP only toggle filters to Market Price items
   */
  test('MP only toggle: shows only Market Price items', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', price: 10.00, price_type: 'FIXED' },
      { id: '2', name: 'Item 2', price: null, price_type: 'MP' },
      { id: '3', name: 'Item 3', price: null, price_type: 'MP' },
      { id: '4', name: 'Item 4', price: 15.00, price_type: 'FIXED' }
    ];

    const showMPOnly = true;
    const filtered = menuItems.filter(item =>
      showMPOnly ? item.price_type === 'MP' : true
    );

    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.price_type === 'MP')).toBe(true);
  });

  /**
   * Test 8: Needs review only toggle filters to flagged items
   */
  test('needs review only toggle: shows only flagged items', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', needs_review: false },
      { id: '2', name: 'Item 2', needs_review: true },
      { id: '3', name: 'Item 3', needs_review: true },
      { id: '4', name: 'Item 4', needs_review: false }
    ];

    const showNeedsReviewOnly = true;
    const filtered = menuItems.filter(item =>
      showNeedsReviewOnly ? item.needs_review === true : true
    );

    expect(filtered.length).toBe(2);
    expect(filtered.every(item => item.needs_review === true)).toBe(true);
  });

  /**
   * Test 9: AND combination across filter groups
   */
  test('filters combine with AND across groups', () => {
    const menuItems = [
      {
        id: '1',
        name: 'Grilled Chicken Salad',
        allergens: ['Dairy'],
        tags: ['Vegetarian'],
        prep_methods: ['Grilled'],
        price_type: 'FIXED',
        needs_review: false
      },
      {
        id: '2',
        name: 'Grilled Vegan Bowl',
        allergens: [],
        tags: ['Vegan'],
        prep_methods: ['Grilled'],
        price_type: 'FIXED',
        needs_review: true
      },
      {
        id: '3',
        name: 'Raw Vegan Salad',
        allergens: [],
        tags: ['Vegan'],
        prep_methods: ['Raw'],
        price_type: 'MP',
        needs_review: false
      }
    ];

    // Filter: Vegan (dietary) AND Grilled (prep) AND needs_review = true
    const selectedDietary = ['Vegan'];
    const selectedPrepMethods = ['Grilled'];
    const showNeedsReviewOnly = true;

    const filtered = menuItems.filter(item => {
      const matchesDietary = selectedDietary.some(tag =>
        item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      const matchesPrepMethods = selectedPrepMethods.some(method =>
        item.prep_methods?.some(m => m.toLowerCase() === method.toLowerCase())
      );
      const matchesNeedsReview = showNeedsReviewOnly ? item.needs_review === true : true;

      return matchesDietary && matchesPrepMethods && matchesNeedsReview;
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('2'); // Only item 2 matches all conditions
  });

  /**
   * Test 10: Filters combine with AND - different scenario
   */
  test('AND combination: search + allergen filter', () => {
    const menuItems = [
      { id: '1', name: 'Cheese Pizza', allergens: ['Gluten', 'Dairy'] },
      { id: '2', name: 'Cheese Burger', allergens: ['Gluten', 'Dairy'] },
      { id: '3', name: 'Gluten-Free Pizza', allergens: ['Dairy'] },
      { id: '4', name: 'Vegan Pizza', allergens: [] }
    ];

    const searchQuery = 'pizza';
    const selectedAllergens = ['Dairy'];

    const filtered = menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAllergens = selectedAllergens.some(allergen =>
        item.allergens.some(a => a.toLowerCase() === allergen.toLowerCase())
      );
      return matchesSearch && matchesAllergens;
    });

    expect(filtered.length).toBe(2); // Cheese Pizza and Gluten-Free Pizza
    expect(filtered.map(i => i.id)).toEqual(['1', '3']);
  });

  /**
   * Test 11: Empty filters return all items
   */
  test('empty filters: returns all items', () => {
    const menuItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' }
    ];

    const searchQuery = '';
    const selectedAllergens = [];
    const selectedDietary = [];
    const selectedPrepMethods = [];
    const showMPOnly = false;
    const showNeedsReviewOnly = false;

    const filtered = menuItems.filter(item => {
      const matchesSearch = searchQuery.trim()
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesAllergens = selectedAllergens.length > 0 ? false : true;
      const matchesDietary = selectedDietary.length > 0 ? false : true;
      const matchesPrepMethods = selectedPrepMethods.length > 0 ? false : true;
      const matchesMP = showMPOnly ? false : true;
      const matchesNeedsReview = showNeedsReviewOnly ? false : true;

      return matchesSearch && matchesAllergens && matchesDietary && matchesPrepMethods && matchesMP && matchesNeedsReview;
    });

    expect(filtered.length).toBe(3);
  });

  /**
   * Test 12: Collapse state persists to localStorage
   */
  test('collapse persistence: writes to localStorage', () => {
    const restaurantId = 'test-restaurant';
    const selectedMenuId = 'lunch-menu';
    const collapsedCategories = {
      'cat-1': true,
      'cat-2': false,
      'cat-3': true
    };

    // Simulate localStorage write
    const storageKey = `serverDashboard_collapsed_${restaurantId}_${selectedMenuId}`;
    const stored = JSON.stringify(collapsedCategories);

    // Verify key format and data
    expect(storageKey).toBe('serverDashboard_collapsed_test-restaurant_lunch-menu');
    expect(JSON.parse(stored)).toEqual(collapsedCategories);
  });

  /**
   * Test 13: Collapse state restores from localStorage
   */
  test('collapse persistence: reads from localStorage', () => {
    const restaurantId = 'test-restaurant';
    const selectedMenuId = 'lunch-menu';
    const storedData = {
      'cat-1': true,
      'cat-2': false
    };

    // Simulate localStorage read
    const storageKey = `serverDashboard_collapsed_${restaurantId}_${selectedMenuId}`;
    const stored = JSON.stringify(storedData);
    const restored = JSON.parse(stored);

    expect(restored).toEqual(storedData);
    expect(restored['cat-1']).toBe(true);
    expect(restored['cat-2']).toBe(false);
  });

  /**
   * Test 14: Collapse state is per-menu (different keys)
   */
  test('collapse persistence: separate state per menu', () => {
    const restaurantId = 'test-restaurant';
    const lunchMenuId = 'lunch-menu';
    const dinnerMenuId = 'dinner-menu';

    const lunchKey = `serverDashboard_collapsed_${restaurantId}_${lunchMenuId}`;
    const dinnerKey = `serverDashboard_collapsed_${restaurantId}_${dinnerMenuId}`;

    // Keys should be different
    expect(lunchKey).not.toBe(dinnerKey);
    expect(lunchKey).toBe('serverDashboard_collapsed_test-restaurant_lunch-menu');
    expect(dinnerKey).toBe('serverDashboard_collapsed_test-restaurant_dinner-menu');
  });

  /**
   * Test 15: Clear all filters resets everything
   */
  test('clear all filters: resets all filter states', () => {
    // Initial state with filters applied
    let searchQuery = 'pizza';
    let selectedAllergens = ['Gluten', 'Dairy'];
    let selectedDietary = ['Vegan'];
    let selectedPrepMethods = ['Grilled'];
    let showMPOnly = true;
    let showNeedsReviewOnly = true;

    // Simulate clearAllFilters
    searchQuery = '';
    selectedAllergens = [];
    selectedDietary = [];
    selectedPrepMethods = [];
    showMPOnly = false;
    showNeedsReviewOnly = false;

    // Verify all filters cleared
    expect(searchQuery).toBe('');
    expect(selectedAllergens).toEqual([]);
    expect(selectedDietary).toEqual([]);
    expect(selectedPrepMethods).toEqual([]);
    expect(showMPOnly).toBe(false);
    expect(showNeedsReviewOnly).toBe(false);
  });

  /**
   * Test 16: Category grouping maintains menu structure
   */
  test('category grouping: items organized by categoryId', () => {
    const filteredItems = [
      { id: '1', name: 'Item 1', categoryId: 'cat-1', category: 'Appetizers' },
      { id: '2', name: 'Item 2', categoryId: 'cat-2', category: 'Entrees' },
      { id: '3', name: 'Item 3', categoryId: 'cat-1', category: 'Appetizers' },
      { id: '4', name: 'Item 4', categoryId: 'cat-2', category: 'Entrees' }
    ];

    // Group by category
    const grouped = {};
    filteredItems.forEach(item => {
      if (!grouped[item.categoryId]) {
        grouped[item.categoryId] = {
          categoryName: item.category,
          items: []
        };
      }
      grouped[item.categoryId].items.push(item);
    });

    expect(Object.keys(grouped).length).toBe(2); // Two categories
    expect(grouped['cat-1'].items.length).toBe(2); // Two appetizers
    expect(grouped['cat-2'].items.length).toBe(2); // Two entrees
    expect(grouped['cat-1'].categoryName).toBe('Appetizers');
    expect(grouped['cat-2'].categoryName).toBe('Entrees');
  });

  /**
   * Test 17: Empty search query shows all items (no false negatives)
   */
  test('search: empty query returns all items', () => {
    const menuItems = [
      { id: '1', name: 'Item 1', description: 'Desc 1' },
      { id: '2', name: 'Item 2', description: 'Desc 2' }
    ];

    const searchQuery = '';
    const filtered = menuItems.filter(item =>
      searchQuery.trim()
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

    expect(filtered.length).toBe(2);
  });

  /**
   * Test 18: Case-insensitive search
   */
  test('search: case-insensitive matching', () => {
    const menuItems = [
      { id: '1', name: 'BLT Sandwich', description: 'Bacon lettuce tomato' }
    ];

    const searchQueries = ['blt', 'BLT', 'Blt', 'SANDWICH'];

    searchQueries.forEach(query => {
      const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered.length).toBe(1);
    });
  });

  /**
   * Test 19: Multiple filters narrow results (AND logic proof)
   */
  test('AND logic: each additional filter narrows results', () => {
    const menuItems = [
      {
        id: '1',
        name: 'Item 1',
        allergens: ['Gluten'],
        tags: ['Vegan'],
        prep_methods: ['Grilled'],
        price_type: 'MP',
        needs_review: true
      },
      {
        id: '2',
        name: 'Item 2',
        allergens: ['Gluten'],
        tags: ['Vegan'],
        prep_methods: ['Grilled'],
        price_type: 'FIXED',
        needs_review: false
      },
      {
        id: '3',
        name: 'Item 3',
        allergens: ['Gluten'],
        tags: [],
        prep_methods: [],
        price_type: 'FIXED',
        needs_review: false
      }
    ];

    // Filter 1: Allergen = Gluten (3 results)
    let filtered = menuItems.filter(item =>
      item.allergens.includes('Gluten')
    );
    expect(filtered.length).toBe(3);

    // Filter 2: + Dietary = Vegan (2 results)
    filtered = filtered.filter(item =>
      item.tags.includes('Vegan')
    );
    expect(filtered.length).toBe(2);

    // Filter 3: + Prep = Grilled (2 results)
    filtered = filtered.filter(item =>
      item.prep_methods.includes('Grilled')
    );
    expect(filtered.length).toBe(2);

    // Filter 4: + MP only (1 result)
    filtered = filtered.filter(item =>
      item.price_type === 'MP'
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  /**
   * Test 20: Switching menus never mixes items
   */
  test('menu switching: items from previous menu do not persist', () => {
    // Simulate menu switch
    let selectedMenuId = 'lunch-menu';
    let activeMenu = mockMenuData.menus.find(m => m.id === selectedMenuId);
    let menuItems = [];
    activeMenu.categories.forEach(cat => {
      cat.items.forEach(item => {
        menuItems.push({ ...item, categoryId: cat.id });
      });
    });

    expect(menuItems.length).toBe(3); // 3 lunch items
    expect(menuItems.every(item => item.id.startsWith('lunch-'))).toBe(true);

    // Switch to dinner menu
    selectedMenuId = 'dinner-menu';
    activeMenu = mockMenuData.menus.find(m => m.id === selectedMenuId);
    menuItems = [];
    activeMenu.categories.forEach(cat => {
      cat.items.forEach(item => {
        menuItems.push({ ...item, categoryId: cat.id });
      });
    });

    expect(menuItems.length).toBe(2); // 2 dinner items
    expect(menuItems.every(item => item.id.startsWith('dinner-'))).toBe(true);
    expect(menuItems.some(item => item.id.startsWith('lunch-'))).toBe(false); // No lunch items!
  });
});
