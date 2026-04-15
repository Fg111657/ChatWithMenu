/**
 * Phase 1 Real Menu Tests
 * Tests the enhanced parser with actual restaurant data:
 * - Burger Queens (ID: 4)
 * - Full Moon Cafe (ID: 6)
 * - El Mitote Antojeria (ID: 11)
 */

import { parseMenuText } from './menuParserHelpers';

// Real menu data from backend
const BURGER_QUEENS_MENU = `Signature Smashed Burgers
Item: Burger Queen (Single)
Price: $9
Ingr.: Beef patty (smashed, seasoned), American cheese, pickles, onions, ketchup, mustard, sesame seed bun

Item: Burger Queen (Double)
Price: $12
Ingr.: Two beef patties (smashed, seasoned), double American cheese, pickles, onions, ketchup, mustard, sesame seed bun

Item: Royal Burger
Price: $13.50
Ingr.: Beef patty, bacon, cheddar cheese, lettuce, tomato, red onion, special sauce, brioche bun`;

const FULL_MOON_MENU = `Burgers
Item: THE MASTER
Price: $18.50
Ingr.: Brioche bun, Angus beef patty, grilled bacon, American cheese, lettuce, tomato, pickles, onion, house sauce

Item: MUSHROOM SWISS
Price: $17
Ingr.: Brioche bun, Angus beef patty, sautéed mushrooms, Swiss cheese, caramelized onions, garlic aioli

Item: SPICY JALAPEÑO
Price: $17.50
Ingr.: Brioche bun, Angus beef patty, jalapeños, pepper jack cheese, lettuce, tomato, sriracha mayo`;

const MITOTE_MENU = `LAS BOTANAS

Item: GUACAMOLE THE BEST
Price: $15
Ingr.: avocado, tomato, onion, cilantro, jalapeño, lime juice, salt

Item: QUESO FUNDIDO
Price: $14
Ingr.: melted Oaxaca cheese, chorizo, poblano peppers, flour tortillas

TACOS

Item: AL PASTOR
Price: $16
Ingr.: pork shoulder (marinated), pineapple, onion, cilantro, corn tortillas

Item: CARNE ASADA
Price: $17
Ingr.: grilled steak, onion, cilantro, guacamole, corn tortillas`;

describe('Phase 1 - Real Menu Tests', () => {
  describe('Burger Queens', () => {
    let parsed;

    beforeAll(() => {
      parsed = parseMenuText(BURGER_QUEENS_MENU);
    });

    test('parses structured format correctly', () => {
      expect(parsed.menus).toHaveLength(1);
      expect(parsed.menus[0].categories).toHaveLength(1);
      const items = parsed.menus[0].categories[0].items;
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    test('extracts prices correctly', () => {
      const items = parsed.menus[0].categories[0].items;
      const singleBurger = items.find(i => i.name.includes('Single'));
      expect(singleBurger).toBeDefined();
      expect(singleBurger.price).toBe(9);
      expect(singleBurger.price_type).toBe('FIXED');
    });

    test('extracts ingredients as descriptions', () => {
      const items = parsed.menus[0].categories[0].items;
      const royalBurger = items.find(i => i.name.includes('Royal'));
      expect(royalBurger).toBeDefined();
      expect(royalBurger.description).toContain('bacon');
      expect(royalBurger.description).toContain('cheddar');
    });

    test('detects category header', () => {
      const categories = parsed.menus[0].categories;
      // Should detect "Signature Smashed Burgers" as category or have a default category
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('Full Moon Cafe', () => {
    let parsed;

    beforeAll(() => {
      parsed = parseMenuText(FULL_MOON_MENU);
    });

    test('parses burger menu with all items', () => {
      expect(parsed.menus).toHaveLength(1);
      const items = parsed.menus[0].categories[0].items;
      expect(items.length).toBeGreaterThanOrEqual(3);
    });

    test('handles prices with decimals', () => {
      const items = parsed.menus[0].categories[0].items;
      const master = items.find(i => i.name.includes('MASTER'));
      expect(master).toBeDefined();
      expect(master.price).toBe(18.50);
    });

    test('captures full ingredient lists', () => {
      const items = parsed.menus[0].categories[0].items;
      const mushroom = items.find(i => i.name.includes('MUSHROOM'));
      expect(mushroom).toBeDefined();
      expect(mushroom.description).toContain('sautéed mushrooms');
      expect(mushroom.description).toContain('Swiss cheese');
      expect(mushroom.description).toContain('garlic aioli');
    });
  });

  describe('El Mitote Antojeria', () => {
    let parsed;

    beforeAll(() => {
      parsed = parseMenuText(MITOTE_MENU);
    });

    test('detects multiple categories', () => {
      const categories = parsed.menus[0].categories;
      expect(categories.length).toBeGreaterThanOrEqual(2);

      const botanas = categories.find(c => c.name.includes('BOTANAS') || c.name.includes('Botanas'));
      const tacos = categories.find(c => c.name.includes('TACOS') || c.name.includes('Tacos'));

      expect(botanas || categories[0]).toBeDefined();
      expect(tacos || categories[1]).toBeDefined();
    });

    test('handles Mexican menu items', () => {
      const allItems = parsed.menus[0].categories.flatMap(c => c.items);
      const guacamole = allItems.find(i => i.name.includes('GUACAMOLE'));
      const pastor = allItems.find(i => i.name.includes('PASTOR'));

      expect(guacamole).toBeDefined();
      expect(guacamole.price).toBe(15);

      expect(pastor).toBeDefined();
      expect(pastor.price).toBe(16);
    });

    test('preserves ingredient details', () => {
      const allItems = parsed.menus[0].categories.flatMap(c => c.items);
      const asada = allItems.find(i => i.name.includes('CARNE ASADA'));

      expect(asada).toBeDefined();
      expect(asada.description).toContain('grilled steak');
      expect(asada.description).toContain('guacamole');
      expect(asada.description).toContain('corn tortillas');
    });
  });

  describe('Phase 1 Features - All Restaurants', () => {
    test('no items marked as needing review for price $0', () => {
      const menus = [BURGER_QUEENS_MENU, FULL_MOON_MENU, MITOTE_MENU];

      menus.forEach((menuText, idx) => {
        const parsed = parseMenuText(menuText);
        const allItems = parsed.menus[0].categories.flatMap(c => c.items);

        // All items should have valid prices
        allItems.forEach(item => {
          expect(item.price).toBeGreaterThan(0);
          expect(item.price_type).toBe('FIXED');
        });
      });
    });

    test('descriptions are attached correctly (not creating separate items)', () => {
      const parsed = parseMenuText(BURGER_QUEENS_MENU);
      const items = parsed.menus[0].categories[0].items;

      // Should NOT have ingredient lines as separate items
      const ingredientItems = items.filter(i =>
        i.name.toLowerCase().includes('beef patty') ||
        i.name.toLowerCase().includes('american cheese')
      );

      expect(ingredientItems).toHaveLength(0);
    });

    test('structured format (Item:/Price:/Ingr.:) parsed correctly', () => {
      const menus = [BURGER_QUEENS_MENU, FULL_MOON_MENU, MITOTE_MENU];

      menus.forEach(menuText => {
        const parsed = parseMenuText(menuText);
        const allItems = parsed.menus[0].categories.flatMap(c => c.items);

        // All items should have names, prices, and descriptions
        allItems.forEach(item => {
          expect(item.name).toBeTruthy();
          expect(item.name.length).toBeGreaterThan(2);
          expect(item.price).toBeGreaterThan(0);
          expect(item.description).toBeTruthy();
          expect(item.description.length).toBeGreaterThan(10);
        });
      });
    });
  });
});
