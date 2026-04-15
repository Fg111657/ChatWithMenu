// Menu Manager Helper Functions
// Extracted for testability

// Generate UUID (with fallback for non-secure contexts)
export const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for HTTP contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

// Format price for display - handles Market Price items
export const formatPrice = (item, currency = 'USD') => {
  if (item.price_type === 'MP' || item.price === null) {
    return 'MP';
  }
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${item.price?.toFixed(2) || '0.00'}`;
};

// === MODIFIER GROUP HELPERS ===

// Create empty modifier group
export const createEmptyModifierGroup = (displayOrder = 1) => ({
  id: generateId(),
  name: '',
  selection_type: 'SINGLE',
  min_select: 0,
  max_select: 1,
  required: false,
  display_order: displayOrder,
  options: [],
});

// Create empty modifier option
export const createEmptyModifierOption = (displayOrder = 1) => ({
  id: generateId(),
  name: '',
  price_delta: 0,
  is_default: false,
  display_order: displayOrder,
});

// Validate modifier group rules
export const validateModifierGroup = (group) => {
  const errors = [];

  if (!group.name?.trim()) {
    errors.push('Group name is required');
  }

  if (group.selection_type === 'SINGLE') {
    if (group.max_select !== 1) {
      errors.push('Single selection must have max_select = 1');
    }
    if (group.min_select > 1) {
      errors.push('Single selection min_select must be 0 or 1');
    }
  } else if (group.selection_type === 'MULTIPLE') {
    if (group.max_select < 1) {
      errors.push('Multiple selection must have max_select >= 1');
    }
    if (group.min_select > group.max_select) {
      errors.push('min_select cannot exceed max_select');
    }
  }

  if (group.required && group.min_select < 1) {
    errors.push('Required groups must have min_select >= 1');
  }

  // Validate options
  group.options?.forEach((opt, idx) => {
    if (!opt.name?.trim()) {
      errors.push(`Option ${idx + 1}: name is required`);
    }
    if (opt.price_delta < 0) {
      errors.push(`Option ${idx + 1}: price cannot be negative`);
    }
  });

  // Single selection: only one default allowed
  if (group.selection_type === 'SINGLE') {
    const defaultCount = group.options?.filter(o => o.is_default).length || 0;
    if (defaultCount > 1) {
      errors.push('Single selection can only have one default option');
    }
  }

  return { valid: errors.length === 0, errors };
};

// Normalize item to ensure modifier fields exist
export const normalizeItemModifiers = (item) => ({
  ...item,
  modifier_groups: item.modifier_groups || [],
  removable_ingredients: item.removable_ingredients || [],
});

// Add removable ingredient (case-insensitive dedup)
export const addRemovableIngredient = (list, value) => {
  const trimmed = value?.trim();
  if (!trimmed) return list;
  const lower = trimmed.toLowerCase();
  if (list.some(i => i.toLowerCase() === lower)) return list;
  return [...list, trimmed];
};
