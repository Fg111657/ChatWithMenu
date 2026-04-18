/**
 * Menu API Guards - V2 Format Enforcement
 *
 * Validates that menu data conforms to V2 schema.
 * Throws descriptive errors if validation fails.
 *
 * Usage:
 *   const menuData = response.menus[0].menu_data;
 *   assertMenuDataV2(menuData); // Throws if invalid
 */

/**
 * Validate that menu_data is in V2 format.
 *
 * V2 format requirements:
 * - version === 2
 * - menus array exists
 * - each menu has categories array
 * - each item has:
 *   - name (string)
 *   - price_type in {FIXED, MP}
 *   - price is null if MP, number if FIXED
 *
 * @param {object} menuData - Menu data object to validate
 * @throws {Error} If menu data is not valid V2 format
 */
export function assertMenuDataV2(menuData) {
  // Check for null/undefined
  if (!menuData) {
    throw new Error(
      'Menu data is missing or null. Please re-import your menu or contact support.'
    );
  }

  // Check if it's an object
  if (typeof menuData !== 'object') {
    throw new Error(
      `Menu data must be an object, got ${typeof menuData}. Please re-import your menu.`
    );
  }

  // Check version
  if (menuData.version !== 2) {
    throw new Error(
      `Menu data is outdated (version ${menuData.version || 'unknown'}). Expected version 2. Please re-import or contact support.`
    );
  }

  // Check menus array
  if (!Array.isArray(menuData.menus)) {
    throw new Error(
      'Menu data is missing "menus" array. This menu uses an outdated format. Please re-import or contact support.'
    );
  }

  // V1 format check (sections not allowed)
  if (menuData.sections) {
    throw new Error(
      'Menu data contains "sections" which is an outdated format (V1). Expected "menus" with "categories". Please re-import your menu.'
    );
  }

  // Validate each menu
  menuData.menus.forEach((menu, menuIdx) => {
    if (!menu || typeof menu !== 'object') {
      throw new Error(
        `Menu at index ${menuIdx} is invalid. Please re-import your menu.`
      );
    }

    if (!Array.isArray(menu.categories)) {
      throw new Error(
        `Menu "${menu.name || menuIdx}" is missing "categories" array. Please re-import your menu.`
      );
    }

    // Validate each category
    menu.categories.forEach((category, catIdx) => {
      if (!category || typeof category !== 'object') {
        throw new Error(
          `Category at index ${catIdx} in menu "${menu.name || menuIdx}" is invalid.`
        );
      }

      if (!Array.isArray(category.items)) {
        throw new Error(
          `Category "${category.name || catIdx}" is missing "items" array.`
        );
      }

      // Validate each item
      category.items.forEach((item, itemIdx) => {
        if (!item || typeof item !== 'object') {
          throw new Error(
            `Item at index ${itemIdx} in category "${category.name}" is invalid.`
          );
        }

        // Validate name
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(
            `Item at index ${itemIdx} in category "${category.name}" is missing a valid name.`
          );
        }

        // Validate price_type
        if (!item.price_type || !['FIXED', 'MP'].includes(item.price_type)) {
          throw new Error(
            `Item "${item.name}" has invalid price_type: "${item.price_type}". Must be "FIXED" or "MP".`
          );
        }

        // Validate price consistency
        if (item.price_type === 'MP') {
          if (item.price !== null && item.price !== undefined) {
            throw new Error(
              `Item "${item.name}" has price_type="MP" but price is not null (got ${item.price}). Market price items must have price=null.`
            );
          }
        } else if (item.price_type === 'FIXED') {
          if (typeof item.price !== 'number') {
            throw new Error(
              `Item "${item.name}" has price_type="FIXED" but price is not a number (got ${typeof item.price}). Fixed price items must have a numeric price.`
            );
          }
          if (item.price < 0) {
            throw new Error(
              `Item "${item.name}" has negative price: ${item.price}. Prices cannot be negative.`
            );
          }
        }
      });
    });
  });
}

/**
 * Check if menu_data is valid V2 format without throwing.
 *
 * @param {object} menuData - Menu data object to check
 * @returns {boolean} True if valid V2, false otherwise
 */
export function isValidV2(menuData) {
  try {
    assertMenuDataV2(menuData);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a friendly error message for display to users.
 *
 * @param {Error} error - Error from assertMenuDataV2
 * @returns {string} User-friendly error message
 */
export function getFriendlyErrorMessage(error) {
  if (error?.message) {
    return error.message;
  }
  return 'Menu data is in an unrecognized format. Please re-import your menu or contact support.';
}
