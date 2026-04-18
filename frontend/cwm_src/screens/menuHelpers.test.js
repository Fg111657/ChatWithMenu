import {
  generateId,
  createEmptyModifierGroup,
  createEmptyModifierOption,
  validateModifierGroup,
  normalizeItemModifiers,
  addRemovableIngredient,
} from './menuHelpers';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('returns UUID-like format', () => {
    const id = generateId();
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('createEmptyModifierGroup', () => {
  it('creates a modifier group with default values', () => {
    const group = createEmptyModifierGroup();
    expect(group.id).toBeDefined();
    expect(group.name).toBe('');
    expect(group.selection_type).toBe('SINGLE');
    expect(group.min_select).toBe(0);
    expect(group.max_select).toBe(1);
    expect(group.required).toBe(false);
    expect(group.display_order).toBe(1);
    expect(group.options).toEqual([]);
  });

  it('uses provided display_order', () => {
    const group = createEmptyModifierGroup(5);
    expect(group.display_order).toBe(5);
  });
});

describe('createEmptyModifierOption', () => {
  it('creates a modifier option with default values', () => {
    const option = createEmptyModifierOption();
    expect(option.id).toBeDefined();
    expect(option.name).toBe('');
    expect(option.price_delta).toBe(0);
    expect(option.is_default).toBe(false);
    expect(option.display_order).toBe(1);
  });

  it('uses provided display_order', () => {
    const option = createEmptyModifierOption(3);
    expect(option.display_order).toBe(3);
  });
});

describe('validateModifierGroup', () => {
  it('validates a valid single-selection group', () => {
    const group = {
      name: 'Choose size',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 1,
      required: false,
      options: [
        { name: 'Small', price_delta: 0, is_default: true },
        { name: 'Medium', price_delta: 2, is_default: false },
        { name: 'Large', price_delta: 4, is_default: false },
      ],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validates a valid multiple-selection group', () => {
    const group = {
      name: 'Select toppings',
      selection_type: 'MULTIPLE',
      min_select: 0,
      max_select: 5,
      required: false,
      options: [
        { name: 'Cheese', price_delta: 1, is_default: false },
        { name: 'Bacon', price_delta: 2, is_default: false },
      ],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('requires group name', () => {
    const group = {
      name: '',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 1,
      required: false,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Group name is required');
  });

  it('validates single selection max_select must be 1', () => {
    const group = {
      name: 'Invalid',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 3, // Invalid for SINGLE
      required: false,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Single selection must have max_select = 1');
  });

  it('validates single selection min_select cannot exceed 1', () => {
    const group = {
      name: 'Invalid',
      selection_type: 'SINGLE',
      min_select: 2, // Invalid for SINGLE
      max_select: 1,
      required: false,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Single selection min_select must be 0 or 1');
  });

  it('validates multiple selection max_select >= 1', () => {
    const group = {
      name: 'Invalid',
      selection_type: 'MULTIPLE',
      min_select: 0,
      max_select: 0, // Invalid
      required: false,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Multiple selection must have max_select >= 1');
  });

  it('validates min_select cannot exceed max_select for multiple', () => {
    const group = {
      name: 'Invalid',
      selection_type: 'MULTIPLE',
      min_select: 5,
      max_select: 3,
      required: false,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('min_select cannot exceed max_select');
  });

  it('validates required groups must have min_select >= 1', () => {
    const group = {
      name: 'Required',
      selection_type: 'SINGLE',
      min_select: 0, // Invalid when required
      max_select: 1,
      required: true,
      options: [],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Required groups must have min_select >= 1');
  });

  it('validates option names are required', () => {
    const group = {
      name: 'With options',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 1,
      required: false,
      options: [
        { name: '', price_delta: 0, is_default: false },
      ],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Option 1: name is required');
  });

  it('validates option prices cannot be negative', () => {
    const group = {
      name: 'With options',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 1,
      required: false,
      options: [
        { name: 'Bad price', price_delta: -5, is_default: false },
      ],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Option 1: price cannot be negative');
  });

  it('validates single selection can only have one default', () => {
    const group = {
      name: 'Multiple defaults',
      selection_type: 'SINGLE',
      min_select: 0,
      max_select: 1,
      required: false,
      options: [
        { name: 'Option 1', price_delta: 0, is_default: true },
        { name: 'Option 2', price_delta: 0, is_default: true },
      ],
    };
    const result = validateModifierGroup(group);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Single selection can only have one default option');
  });
});

describe('normalizeItemModifiers', () => {
  it('adds modifier_groups and removable_ingredients if missing', () => {
    const item = { name: 'Test item', price: 10 };
    const normalized = normalizeItemModifiers(item);
    expect(normalized.modifier_groups).toEqual([]);
    expect(normalized.removable_ingredients).toEqual([]);
  });

  it('preserves existing modifier_groups and removable_ingredients', () => {
    const item = {
      name: 'Test item',
      modifier_groups: [{ id: '1', name: 'Size' }],
      removable_ingredients: ['onions'],
    };
    const normalized = normalizeItemModifiers(item);
    expect(normalized.modifier_groups).toEqual([{ id: '1', name: 'Size' }]);
    expect(normalized.removable_ingredients).toEqual(['onions']);
  });

  it('preserves other item properties', () => {
    const item = { name: 'Test', price: 15, description: 'Desc' };
    const normalized = normalizeItemModifiers(item);
    expect(normalized.name).toBe('Test');
    expect(normalized.price).toBe(15);
    expect(normalized.description).toBe('Desc');
  });
});

describe('addRemovableIngredient', () => {
  it('adds a new ingredient to empty list', () => {
    const result = addRemovableIngredient([], 'onions');
    expect(result).toEqual(['onions']);
  });

  it('adds a new ingredient to existing list', () => {
    const result = addRemovableIngredient(['cheese'], 'onions');
    expect(result).toEqual(['cheese', 'onions']);
  });

  it('trims whitespace from input', () => {
    const result = addRemovableIngredient([], '  onions  ');
    expect(result).toEqual(['onions']);
  });

  it('returns same list for empty input', () => {
    const list = ['cheese'];
    const result = addRemovableIngredient(list, '');
    expect(result).toBe(list);
  });

  it('returns same list for whitespace-only input', () => {
    const list = ['cheese'];
    const result = addRemovableIngredient(list, '   ');
    expect(result).toBe(list);
  });

  it('returns same list for null input', () => {
    const list = ['cheese'];
    const result = addRemovableIngredient(list, null);
    expect(result).toBe(list);
  });

  it('prevents case-insensitive duplicates', () => {
    const list = ['Onions'];
    const result = addRemovableIngredient(list, 'onions');
    expect(result).toBe(list);
  });

  it('prevents exact duplicates', () => {
    const list = ['onions'];
    const result = addRemovableIngredient(list, 'onions');
    expect(result).toBe(list);
  });

  it('allows similar but different ingredients', () => {
    const list = ['onion'];
    const result = addRemovableIngredient(list, 'onions');
    expect(result).toEqual(['onion', 'onions']);
  });
});
