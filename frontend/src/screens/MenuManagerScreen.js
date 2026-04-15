import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';
import {
  generateId,
  createEmptyModifierGroup,
  createEmptyModifierOption,
  validateModifierGroup,
  addRemovableIngredient,
  formatPrice,
} from './menuHelpers';
import { parseMenuText, detectMealPeriod } from './menuParserHelpers';
import { assertMenuDataV2, getFriendlyErrorMessage } from '../services/menuApiGuards';

import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Avatar,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  Alert,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Snackbar,
  Autocomplete,
  Skeleton,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import StorefrontIcon from '@mui/icons-material/Storefront';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UploadIcon from '@mui/icons-material/Upload';

// Default empty menu structure
// Hierarchy: Restaurant → Menus (meal periods) → Categories (course groupings) → Items
const createEmptyMenuData = () => ({
  version: 2,
  currency: 'USD',
  language: 'en',
  updated_at: new Date().toISOString(),
  raw_input: '',
  menus: [
    {
      id: generateId(),
      name: 'Dinner',
      display_order: 1,
      categories: [],
    }
  ],
  specials: [],
  upsell_tips: [],
  previous_needs_review_percent: null,
});

// Create empty category
const createEmptyCategory = (name = 'New Category', displayOrder = 1) => ({
  id: generateId(),
  name,
  display_order: displayOrder,
  items: [],
});

// Create empty menu (meal period)
const createEmptyMenu = (name = 'Dinner', displayOrder = 1) => ({
  id: generateId(),
  name,
  display_order: displayOrder,
  categories: [],
});

// Compute quality metrics for a specific menu
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

// Helper functions moved to menuParserHelpers


// Parser Quality Metrics Logging
const logParserMetrics = (menu, source = 'unknown') => {
  const allCategories = menu.menus?.[0]?.categories || [];
  const allItems = allCategories.flatMap(c => c.items || []);
  const totalItems = allItems.length;
  const needsReviewCount = allItems.filter(i => i.needs_review).length;
  const withDescription = allItems.filter(i => i.description).length;
  const withModifiers = allItems.filter(i => i.modifiers?.length > 0).length;
  const totalModifiers = allItems.reduce((sum, i) => sum + (i.modifiers?.length || 0), 0);
  const withAllergens = allItems.filter(i => i.allergens?.length > 0).length;

  const metrics = {
    source,
    timestamp: new Date().toISOString(),
    categories: allCategories.length,
    totalItems,
    needsReview: needsReviewCount,
    needsReviewPct: totalItems > 0 ? ((needsReviewCount / totalItems) * 100).toFixed(1) : 0,
    withDescription,
    withDescriptionPct: totalItems > 0 ? ((withDescription / totalItems) * 100).toFixed(1) : 0,
    withModifiers,
    totalModifiers,
    withAllergens,
    specials: menu.specials?.length || 0,
    upsellTips: menu.upsell_tips?.length || 0,
  };

  console.log('[MenuParser Metrics]', metrics);

  // Log review reasons breakdown
  if (needsReviewCount > 0) {
    const reasonCounts = {};
    allItems.forEach(item => {
      (item.review_reasons || []).forEach(reason => {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
    });
    console.log('[MenuParser Review Reasons]', reasonCounts);
  }

  return metrics;
};

// Parser confidence level based on needs_review percentage
const getConfidenceLevel = (needsReviewCount, totalItems) => {
  if (totalItems === 0) return { label: 'N/A', color: 'default' };
  const percent = (needsReviewCount / totalItems) * 100;
  if (percent <= 5) return { label: 'High', color: 'success' };
  if (percent <= 20) return { label: 'Medium', color: 'warning' };
  return { label: 'Low', color: 'error' };
};

// Check for parser quality regression (> 10% increase in needs_review)
const checkParserRegression = (previousPercent, currentPercent) => {
  if (previousPercent === null || previousPercent === undefined) return null;
  const threshold = 10;
  if (currentPercent > previousPercent + threshold) {
    return {
      hasRegression: true,
      previousPercent: previousPercent.toFixed(1),
      currentPercent: currentPercent.toFixed(1),
    };
  }
  return null;
};

const ALLERGEN_OPTIONS = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'sesame'];
const DIETARY_TAG_OPTIONS = ['vegetarian', 'vegan', 'pescatarian', 'gluten-free', 'dairy-free', 'keto', 'halal', 'kosher'];
const PREP_METHOD_OPTIONS = ['grilled', 'fried', 'deep-fried', 'broiled', 'baked', 'roasted', 'steamed', 'sautéed', 'poached', 'raw', 'smoked', 'toasted', 'braised'];

const MenuManagerScreen = () => {
  const navigate = useNavigate();
  const { userId } = useContext(UserContext);

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // UI State
  const [activeTab, setActiveTab] = useState(0); // 0=Menu, 1=Specials, 2=Upsell Tips, 3=Restaurant Profile
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, type: null, data: null });
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);
  const [menuRenameDialog, setMenuRenameDialog] = useState({ open: false, menuId: null, currentName: '' });
  const [menuDeleteConfirm, setMenuDeleteConfirm] = useState({ open: false, menuId: null, menuName: '' });
  const [importDialog, setImportDialog] = useState({
    open: false,
    rawText: '',
    targetMenuId: 'new', // 'new' or specific menu ID
    importMode: 'replace', // 'replace' or 'append'
    preview: null
  });
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const itemRefs = React.useRef({});

  // Get selected menu (default to first if not set)
  const selectedMenu = menuData?.menus?.find(m => m.id === selectedMenuId) || menuData?.menus?.[0];

  // Compute quality metrics for selected menu
  const menuQuality = computeMenuQuality(selectedMenu);

  // Compute items needing review (from selected menu only)
  const allCategories = selectedMenu?.categories || [];
  const itemsNeedingReview = allCategories.flatMap(c =>
    c.items?.filter(i => i.needs_review) || []
  );
  const needsReviewCount = menuQuality.needsReviewCount;

  // Load restaurants list
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await dataService.listRestaurants();
        // Defensive: ensure data is always an array
        const restaurantsList = Array.isArray(data) ? data : [];
        setRestaurants(restaurantsList);
        if (restaurantsList.length > 0) {
          setSelectedRestaurantId(restaurantsList[0].id);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load restaurants');
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  // Helper: Coerce menu_data to V2 format (handles both string and object)
  const coerceMenuDataToV2 = (menuData) => {
    // Case 1: already an object (parsed JSON)
    if (menuData && typeof menuData === "object") return menuData;

    // Case 2: not a string -> can't parse -> return null so UI can show empty state
    if (typeof menuData !== "string") return null;

    const s = menuData.trim();

    // If it looks like JSON, try parsing it
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return JSON.parse(s);
      } catch (e) {
        // fall through to legacy parser
      }
    }

    // Legacy raw text parse
    return parseMenuText(menuData);
  };

  // Load full restaurant data when selection changes
  useEffect(() => {
    if (!selectedRestaurantId && selectedRestaurantId !== 0) return;

    const loadRestaurantData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await dataService.getRestaurant(selectedRestaurantId);
        setRestaurant(data);

        // Parse menu data
        if (data.menus && data.menus.length > 0) {
          const firstMenu = data.menus[0];
          setMenuId(firstMenu.id);

          // Coerce menu_data to V2 format (handles string, object, or legacy text)
          const parsed = coerceMenuDataToV2(firstMenu.menu_data);

          // If coercion failed, use empty structure
          if (!parsed) {
            setMenuData(createEmptyMenuData());
            setLoading(false);
            return;
          }

          // Log metrics if V2 format
          if (parsed.version) {
            logParserMetrics(parsed, 'loaded_json');
          }

          // Normalize parsed data to ensure all required arrays exist
          const normalizedData = {
            ...parsed,
            menus: Array.isArray(parsed?.menus) ? parsed.menus : [],
            specials: Array.isArray(parsed?.specials) ? parsed.specials : [],
            upsell_tips: Array.isArray(parsed?.upsell_tips) ? parsed.upsell_tips : [],
          };

          // Normalize each menu's categories array
          normalizedData.menus = normalizedData.menus.map(menu => ({
            ...menu,
            categories: Array.isArray(menu?.categories) ? menu.categories : [],
          }));

          setMenuData(normalizedData);

          // If V2 format, select first menu and category
          if (normalizedData.menus.length > 0) {
            const firstMenu = normalizedData.menus[0];
            setSelectedMenuId(firstMenu.id);
            console.log('[MenuManager] Default menu selected:', { menuId: firstMenu.id, menuName: firstMenu.name });

            // Select first category in first menu if available
            const firstCategory = firstMenu.categories?.[0];
            if (firstCategory) {
              setSelectedCategoryId(firstCategory.id);
            }
          }
        } else {
          // No menu exists, create empty structure
          const empty = createEmptyMenuData();
          setMenuData(empty);
          setMenuId(null);

          // Select the default menu
          if (empty.menus && empty.menus.length > 0) {
            setSelectedMenuId(empty.menus[0].id);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('[MenuManager] Error loading restaurant:', err);
        setError('Failed to load restaurant data: ' + (err?.message || 'Unknown error'));
        setLoading(false);
      }
    };

    loadRestaurantData();
  }, [selectedRestaurantId]);

  // Validate menu before saving
  const validateMenu = (menu) => {
    const errors = [];

    const categories = menu.menus?.[0]?.categories || [];

    // Check for empty categories
    const emptyCategories = categories.filter(c => !c.items || c.items.length === 0);
    if (emptyCategories.length > 0) {
      errors.push(`${emptyCategories.length} empty category(s) found: ${emptyCategories.map(c => c.name).join(', ')}`);
    }

    // Check for items without names
    const noNameItems = [];
    categories.forEach(c => {
      c.items?.forEach(item => {
        if (!item.name || item.name.trim() === '') {
          noNameItems.push({ category: c.name, item });
        }
      });
    });
    if (noNameItems.length > 0) {
      errors.push(`${noNameItems.length} item(s) without names in: ${[...new Set(noNameItems.map(i => i.category))].join(', ')}`);
    }

    // Check for negative prices
    const negativePrices = [];
    categories.forEach(c => {
      c.items?.forEach(item => {
        if (item.price < 0) {
          negativePrices.push({ name: item.name, price: item.price });
        }
      });
    });
    if (negativePrices.length > 0) {
      errors.push(`${negativePrices.length} item(s) with negative prices`);
    }

    // Check for items with missing prices that haven't been reviewed
    const unpricedUnreviewed = [];
    categories.forEach(c => {
      c.items?.forEach(item => {
        if ((item.price === null || item.price === undefined) && item.needs_review) {
          unpricedUnreviewed.push(item.name || 'Unnamed');
        }
      });
    });
    if (unpricedUnreviewed.length > 0) {
      errors.push(`${unpricedUnreviewed.length} item(s) missing prices need review: ${unpricedUnreviewed.slice(0, 3).join(', ')}${unpricedUnreviewed.length > 3 ? '...' : ''}`);
    }

    return { valid: errors.length === 0, errors };
  };

  // Save menu to backend
  const saveMenu = async () => {
    setError(null);

    // Validate before saving
    const validation = validateMenu(menuData);
    if (!validation.valid) {
      setError('Cannot save menu: ' + validation.errors.join('; '));
      return;
    }

    setSaving(true);

    try {
      // Calculate current needs_review percentage
      const currentNeedsReviewPercent = allItems.length > 0
        ? (needsReviewCount / allItems.length) * 100
        : 0;

      // Check for regression
      const regression = checkParserRegression(
        menuData.previous_needs_review_percent,
        currentNeedsReviewPercent
      );

      const updatedMenu = {
        ...menuData,
        updated_at: new Date().toISOString(),
        previous_needs_review_percent: currentNeedsReviewPercent,
      };

      // Log metrics before save
      logParserMetrics(updatedMenu, 'pre_save');

      if (menuId !== null) {
        await dataService.updateRestaurantMenu(selectedRestaurantId, menuId, JSON.stringify(updatedMenu));
      } else {
        await dataService.addRestaurantMenu(selectedRestaurantId, JSON.stringify(updatedMenu));
      }

      setMenuData(updatedMenu);

      // Show regression warning or success
      if (regression) {
        setSuccess(`Menu saved. ⚠️ Quality decreased: ${regression.previousPercent}% → ${regression.currentPercent}% items need review`);
      } else {
        setSuccess('Menu saved successfully!');
      }
    } catch (err) {
      setError('Failed to save menu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save restaurant profile
  const saveRestaurantProfile = async (updates) => {
    setSaving(true);
    try {
      const updated = await dataService.updateRestaurant(selectedRestaurantId, updates, userId);
      setRestaurant({ ...restaurant, ...updated });
      setSuccess('Restaurant profile updated!');
    } catch (err) {
      setError('Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };

  // Import Menu Functions
  const handleImportPreview = () => {
    if (!importDialog.rawText || !importDialog.rawText.trim()) {
      setError('Please paste menu text to import');
      return;
    }

    try {
      // Parse the text
      const parsedData = parseMenuText(importDialog.rawText);

      // Detect meal period if creating new menu
      const detectedMealPeriod = detectMealPeriod(importDialog.rawText) || 'Dinner';

      // Calculate stats
      const totalCategories = parsedData.menus?.[0]?.categories?.length || 0;
      const totalItems = parsedData.menus?.[0]?.categories?.flatMap(c => c.items || []).length || 0;
      const needsReviewCount = parsedData.menus?.[0]?.categories?.flatMap(c =>
        c.items?.filter(i => i.needs_review) || []
      ).length || 0;
      const mpItemsCount = parsedData.menus?.[0]?.categories?.flatMap(c =>
        c.items?.filter(i => i.price_type === 'MP') || []
      ).length || 0;

      setImportDialog({
        ...importDialog,
        preview: {
          menuName: importDialog.targetMenuId === 'new' ? detectedMealPeriod : selectedMenu?.name,
          totalCategories,
          totalItems,
          needsReviewCount,
          mpItemsCount,
          parsedData
        }
      });

      console.log('[MenuManager] Import preview generated:', {
        menuName: detectedMealPeriod,
        totalCategories,
        totalItems,
        needsReviewCount,
        mpItemsCount
      });
    } catch (err) {
      setError('Failed to parse menu: ' + err.message);
      console.error('[MenuManager] Import parse error:', err);
    }
  };

  const handleImportApply = () => {
    if (!importDialog.preview) {
      setError('No preview available. Please generate preview first.');
      return;
    }

    const { parsedData } = importDialog.preview;
    const importedMenu = parsedData.menus[0]; // Get the parsed menu

    if (importDialog.targetMenuId === 'new') {
      // Create new menu with parsed data
      const newMenu = {
        ...importedMenu,
        id: generateId(),
        name: importDialog.preview.menuName,
        display_order: (menuData.menus?.length || 0) + 1
      };

      setMenuData({
        ...menuData,
        menus: [...(menuData.menus || []), newMenu],
        raw_input: importDialog.rawText,
        updated_at: new Date().toISOString()
      });

      setSelectedMenuId(newMenu.id);
      setSuccess(`Menu "${newMenu.name}" imported successfully! ${importedMenu.categories.length} categories, ${importDialog.preview.totalItems} items.`);

      console.log('[MenuManager] Menu imported (new):', {
        menuId: newMenu.id,
        menuName: newMenu.name,
        categories: importedMenu.categories.length,
        items: importDialog.preview.totalItems
      });
    } else {
      // Replace or append to existing menu
      if (importDialog.importMode === 'replace') {
        // Replace: overwrite categories in target menu
        setMenuData({
          ...menuData,
          menus: menuData.menus.map(menu =>
            menu.id === importDialog.targetMenuId
              ? { ...menu, categories: importedMenu.categories }
              : menu
          ),
          raw_input: importDialog.rawText,
          updated_at: new Date().toISOString()
        });

        setSuccess(`Menu "${selectedMenu?.name}" replaced! ${importedMenu.categories.length} categories, ${importDialog.preview.totalItems} items.`);

        console.log('[MenuManager] Menu imported (replace):', {
          menuId: importDialog.targetMenuId,
          categories: importedMenu.categories.length,
          items: importDialog.preview.totalItems
        });
      } else {
        // Append: add categories to target menu
        const targetMenu = menuData.menus.find(m => m.id === importDialog.targetMenuId);
        const existingCategories = targetMenu?.categories || [];

        setMenuData({
          ...menuData,
          menus: menuData.menus.map(menu =>
            menu.id === importDialog.targetMenuId
              ? { ...menu, categories: [...existingCategories, ...importedMenu.categories] }
              : menu
          ),
          raw_input: importDialog.rawText,
          updated_at: new Date().toISOString()
        });

        setSuccess(`Categories appended to "${selectedMenu?.name}"! Added ${importedMenu.categories.length} categories, ${importDialog.preview.totalItems} items.`);

        console.log('[MenuManager] Menu imported (append):', {
          menuId: importDialog.targetMenuId,
          addedCategories: importedMenu.categories.length,
          items: importDialog.preview.totalItems
        });
      }
    }

    // Close dialog and reset
    setImportDialog({
      open: false,
      rawText: '',
      targetMenuId: 'new',
      importMode: 'replace',
      preview: null
    });
  };

  // Menu CRUD
  const createMenu = () => {
    const newMenu = createEmptyMenu('New Menu', (menuData.menus?.length || 0) + 1);
    setMenuData({
      ...menuData,
      menus: [...(menuData.menus || []), newMenu],
    });
    setSelectedMenuId(newMenu.id);
    setSelectedCategoryId(null);
    console.log('[MenuManager] Menu created:', {
      menuId: newMenu.id,
      menuName: newMenu.name,
      displayOrder: newMenu.display_order
    });
  };

  const renameMenu = (menuId, newName) => {
    if (!newName || !newName.trim()) {
      setError('Menu name cannot be empty');
      return;
    }
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === menuId ? { ...menu, name: newName.trim() } : menu
      ),
    });
    console.log('[MenuManager] Menu renamed:', {
      menuId,
      newName: newName.trim()
    });
  };

  const deleteMenu = (menuId) => {
    // Prevent deleting the last menu
    if (menuData.menus.length <= 1) {
      setError('Cannot delete the last menu. At least one menu is required.');
      return;
    }

    const menuToDelete = menuData.menus.find(m => m.id === menuId);
    const remainingMenus = menuData.menus.filter(m => m.id !== menuId);

    setMenuData({
      ...menuData,
      menus: remainingMenus,
    });

    console.log('[MenuManager] Menu deleted:', {
      menuId,
      menuName: menuToDelete?.name,
      remainingCount: remainingMenus.length
    });

    // If we deleted the selected menu, switch to first remaining menu
    if (selectedMenuId === menuId) {
      const firstMenu = remainingMenus[0];
      setSelectedMenuId(firstMenu.id);
      setSelectedCategoryId(firstMenu.categories?.[0]?.id || null);
    }
  };

  const reorderMenus = (fromIndex, toIndex) => {
    const reordered = [...menuData.menus];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Update display_order for all menus
    const menusWithNewOrder = reordered.map((menu, idx) => ({
      ...menu,
      display_order: idx + 1,
    }));

    setMenuData({
      ...menuData,
      menus: menusWithNewOrder,
    });

    console.log('[MenuManager] Menus reordered:', {
      movedMenu: moved.name,
      fromIndex,
      toIndex,
      newOrder: menusWithNewOrder.map(m => m.name)
    });
  };

  // Category CRUD (operates on selected menu)
  const addCategory = () => {
    const newCategory = {
      id: generateId(),
      name: 'New Category',
      display_order: (selectedMenu?.categories?.length || 0) + 1,
      items: [],
    };
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? { ...menu, categories: [...(menu.categories || []), newCategory] }
          : menu
      ),
    });
    setSelectedCategoryId(newCategory.id);
  };

  const updateCategory = (categoryId, updates) => {
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? {
              ...menu,
              categories: menu.categories.map(c =>
                c.id === categoryId ? { ...c, ...updates } : c
              ),
            }
          : menu
      ),
    });
  };

  const deleteCategory = (categoryId) => {
    const remainingCategories = selectedMenu.categories.filter(c => c.id !== categoryId);
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? { ...menu, categories: remainingCategories }
          : menu
      ),
    });
    if (selectedCategoryId === categoryId) {
      setSelectedCategoryId(remainingCategories[0]?.id || null);
    }
  };

  // Item CRUD
  const addItem = (categoryId) => {
    const newItem = {
      id: generateId(),
      name: '',
      description: '',
      price: 0,
      allergens: [],
      dietary_tags: [],
      prep_methods: [],
      modifiers: [],
      modifier_groups: [],
      removable_ingredients: [],
      available: true,
    };
    setEditDialog({ open: true, type: 'item', data: { categoryId, item: newItem, isNew: true } });
  };

  const saveItem = (categoryId, item, isNew) => {
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? {
              ...menu,
              categories: menu.categories.map(c => {
                if (c.id !== categoryId) return c;
                // Defensive: ensure items array exists
                const items = Array.isArray(c.items) ? c.items : [];
                return {
                  ...c,
                  items: isNew
                    ? [...items, item]
                    : items.map(i => i.id === item.id ? item : i),
                };
              }),
            }
          : menu
      ),
    });
    setEditDialog({ open: false, type: null, data: null });
  };

  const deleteItem = (categoryId, itemId) => {
    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? {
              ...menu,
              categories: menu.categories.map(c => {
                if (c.id !== categoryId) return c;
                return { ...c, items: c.items.filter(i => i.id !== itemId) };
              }),
            }
          : menu
      ),
    });
  };

  // Special CRUD
  const addSpecial = () => {
    const newSpecial = {
      id: generateId(),
      dish_id: null,
      name: '',
      description: '',
      price: 0,
      available_days: [],
    };
    setEditDialog({ open: true, type: 'special', data: { special: newSpecial, isNew: true } });
  };

  const saveSpecial = (special, isNew) => {
    setMenuData({
      ...menuData,
      specials: isNew
        ? [...(menuData.specials || []), special]
        : menuData.specials.map(s => s.id === special.id ? special : s),
    });
    setEditDialog({ open: false, type: null, data: null });
  };

  const deleteSpecial = (specialId) => {
    setMenuData({
      ...menuData,
      specials: menuData.specials.filter(s => s.id !== specialId),
    });
  };

  // Upsell Tip CRUD
  const addUpsellTip = () => {
    const newTip = {
      id: generateId(),
      title: '',
      body: '',
      enabled: true,
      display_order: (menuData.upsell_tips?.length || 0) + 1,
    };
    setEditDialog({ open: true, type: 'upsell', data: { tip: newTip, isNew: true } });
  };

  const saveUpsellTip = (tip, isNew) => {
    setMenuData({
      ...menuData,
      upsell_tips: isNew
        ? [...(menuData.upsell_tips || []), tip]
        : menuData.upsell_tips.map(t => t.id === tip.id ? tip : t),
    });
    setEditDialog({ open: false, type: null, data: null });
  };

  const deleteUpsellTip = (tipId) => {
    setMenuData({
      ...menuData,
      upsell_tips: menuData.upsell_tips.filter(t => t.id !== tipId),
    });
  };

  // Phase 3.5-B: Needs Review Workflow Handlers

  // Scroll to first flagged item and highlight it
  const jumpToFirstFlaggedItem = () => {
    if (!selectedMenu) return;

    // Find first flagged item across all categories
    let firstFlaggedItem = null;
    let firstFlaggedCategoryId = null;

    for (const category of selectedMenu.categories) {
      const flagged = category.items?.find(item => item.needs_review);
      if (flagged) {
        firstFlaggedItem = flagged;
        firstFlaggedCategoryId = category.id;
        break;
      }
    }

    if (!firstFlaggedItem) {
      console.log('[MenuManager] No flagged items found');
      return;
    }

    console.log('[MenuManager] Jumping to first flagged item:', {
      item: firstFlaggedItem.name,
      category: firstFlaggedCategoryId,
      reasons: firstFlaggedItem.review_reasons
    });

    // Switch to Menu tab
    setActiveTab(0);

    // Select the category containing the flagged item
    setSelectedCategoryId(firstFlaggedCategoryId);

    // Highlight the item
    setHighlightedItemId(firstFlaggedItem.id);

    // Scroll to item after short delay (allow category to render)
    setTimeout(() => {
      const itemElement = itemRefs.current[firstFlaggedItem.id];
      if (itemElement) {
        itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedItemId(null);
      }, 3000);
    }, 100);
  };

  // Mark single item as reviewed
  const markItemReviewed = (categoryId, item) => {
    console.log('[MenuManager] Item marked reviewed:', {
      item: item.name,
      previousReasons: item.review_reasons,
      reviewedBy: userId,
      timestamp: new Date().toISOString()
    });

    const updated = {
      ...item,
      needs_review: false,
      review_reasons: [],
      reviewed_by: userId || 'unknown',
      reviewed_at: new Date().toISOString()
    };

    saveItem(categoryId, updated, false);

    // Show success message
    setSuccess(`"${item.name}" marked as reviewed`);
  };

  // Bulk resolve: Mark all flagged items in a category as reviewed
  const markCategoryReviewed = (categoryId) => {
    const category = allCategories.find(c => c.id === categoryId);
    if (!category) return;

    const flaggedItems = category.items?.filter(item => item.needs_review) || [];
    if (flaggedItems.length === 0) {
      setSuccess('No items need review in this category');
      return;
    }

    console.log('[MenuManager] Bulk resolve category:', {
      category: category.name,
      itemCount: flaggedItems.length,
      items: flaggedItems.map(i => i.name),
      reviewedBy: userId,
      timestamp: new Date().toISOString()
    });

    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? {
              ...menu,
              categories: menu.categories.map(c =>
                c.id === categoryId
                  ? {
                      ...c,
                      items: (Array.isArray(c.items) ? c.items : []).map(item =>
                        item.needs_review
                          ? {
                              ...item,
                              needs_review: false,
                              review_reasons: [],
                              reviewed_by: userId || 'unknown',
                              reviewed_at: new Date().toISOString()
                            }
                          : item
                      )
                    }
                  : c
              )
            }
          : menu
      )
    });

    setSuccess(`${flaggedItems.length} item${flaggedItems.length > 1 ? 's' : ''} in "${category.name}" marked as reviewed`);
  };

  // Bulk resolve: Mark all flagged items in the selected menu as reviewed
  const markMenuReviewed = () => {
    if (!selectedMenu) return;

    const allFlaggedItems = selectedMenu.categories.flatMap(c =>
      c.items?.filter(item => item.needs_review) || []
    );

    if (allFlaggedItems.length === 0) {
      setSuccess('No items need review in this menu');
      return;
    }

    console.log('[MenuManager] Bulk resolve menu:', {
      menu: selectedMenu.name,
      itemCount: allFlaggedItems.length,
      categories: selectedMenu.categories.map(c => ({
        name: c.name,
        flaggedCount: c.items?.filter(i => i.needs_review).length || 0
      })),
      reviewedBy: userId,
      timestamp: new Date().toISOString()
    });

    setMenuData({
      ...menuData,
      menus: menuData.menus.map(menu =>
        menu.id === selectedMenuId
          ? {
              ...menu,
              categories: menu.categories.map(c => ({
                ...c,
                items: c.items?.map(item =>
                  item.needs_review
                    ? {
                        ...item,
                        needs_review: false,
                        review_reasons: [],
                        reviewed_by: userId || 'unknown',
                        reviewed_at: new Date().toISOString()
                      }
                    : item
                ) || []
              }))
            }
          : menu
      )
    });

    setSuccess(`${allFlaggedItems.length} item${allFlaggedItems.length > 1 ? 's' : ''} in "${selectedMenu.name}" marked as reviewed`);
  };

  // Get current category
  const currentCategory = allCategories.find(c => c.id === selectedCategoryId);

  // Get all items for special linking
  const allItems = allCategories.flatMap(c => c.items || []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Skeleton Header */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton variant="rectangular" width={80} height={36} />
            <Skeleton variant="rectangular" width={160} height={36} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Skeleton variant="circular" width={64} height={64} sx={{ mx: 'auto', mb: 2 }} />
            <Skeleton variant="text" width={200} sx={{ mx: 'auto' }} />
            <Skeleton variant="text" width={150} sx={{ mx: 'auto' }} />
          </Box>
        </Paper>
        {/* Skeleton Selector */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Skeleton variant="rectangular" height={56} />
        </Paper>
        {/* Skeleton Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', p: 1 }}>
            <Skeleton variant="rectangular" width="25%" height={48} sx={{ mr: 1 }} />
            <Skeleton variant="rectangular" width="25%" height={48} sx={{ mr: 1 }} />
            <Skeleton variant="rectangular" width="25%" height={48} sx={{ mr: 1 }} />
            <Skeleton variant="rectangular" width="25%" height={48} />
          </Box>
        </Paper>
        {/* Skeleton Content */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" sx={{ mb: 2 }} />
              <Stack spacing={1}>
                <Skeleton variant="rectangular" height={48} />
                <Skeleton variant="rectangular" height={48} />
                <Skeleton variant="rectangular" height={48} />
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 2 }}>
              <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={80} />
                <Skeleton variant="rectangular" height={80} />
                <Skeleton variant="rectangular" height={80} />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>Back</Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setImportDialog({
                ...importDialog,
                open: true,
                targetMenuId: selectedMenuId || 'new'
              })}
            >
              Import Menu
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={saveMenu}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'secondary.main', mx: 'auto', mb: 2 }}>
            <MenuBookIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>Menu Manager</Typography>
          <Typography variant="body2" color="text.secondary">
            {restaurant?.name || 'Select a restaurant'}
          </Typography>
        </Box>
      </Paper>

      {/* Error/Success Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Needs Review Alert - Per Menu */}
      {needsReviewCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          icon={<WarningAmberIcon />}
          action={
            <Stack direction="row" spacing={1}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={markMenuReviewed}
              >
                Mark All Reviewed
              </Button>
              <Button
                color="inherit"
                size="small"
                onClick={jumpToFirstFlaggedItem}
              >
                Review Now
              </Button>
            </Stack>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <strong>
              {selectedMenu?.name || 'Menu'}: {needsReviewCount} item{needsReviewCount !== 1 ? 's' : ''} need review
            </strong>
            <Chip
              label={menuQuality.confidenceLabel}
              size="small"
              color={menuQuality.confidenceColor}
            />
            <span>
              ({menuQuality.needsReviewPercent}% of {menuQuality.totalItems} items)
            </span>
          </Box>
        </Alert>
      )}

      {/* Restaurant Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Select Restaurant</InputLabel>
          <Select
            value={selectedRestaurantId}
            label="Select Restaurant"
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
          >
            {restaurants.map((r) => (
              <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth">
          <Tab icon={<RestaurantMenuIcon />} label="Menu Items" iconPosition="start" />
          <Tab icon={<LocalOfferIcon />} label="Specials" iconPosition="start" />
          <Tab icon={<TipsAndUpdatesIcon />} label="Upsell Tips" iconPosition="start" />
          <Tab icon={<StorefrontIcon />} label="Restaurant Profile" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && menuData && (
        <>
          {/* Menu Management Section */}
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Menu Selector - Always show */}
              <FormControl fullWidth sx={{ flex: 1 }}>
                <InputLabel>Menu</InputLabel>
                <Select
                  value={selectedMenuId || ''}
                  label="Menu"
                  onChange={(e) => {
                    const newMenuId = e.target.value;
                    setSelectedMenuId(newMenuId);
                    const newMenu = menuData.menus.find(m => m.id === newMenuId);
                    console.log('[MenuManager] Menu switched:', {
                      menuId: newMenuId,
                      menuName: newMenu?.name,
                      categoryCount: newMenu?.categories?.length || 0
                    });
                    // Reset selected category when switching menus
                    const firstCategory = newMenu?.categories?.[0];
                    setSelectedCategoryId(firstCategory?.id || null);
                  }}
                >
                  {menuData.menus.map((menu) => (
                    <MenuItem key={menu.id} value={menu.id}>
                      {menu.name || 'Unnamed Menu'} ({menu.categories?.length || 0} categories)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Menu CRUD Controls */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Add Menu Button */}
                <IconButton
                  color="primary"
                  onClick={createMenu}
                  title="Add New Menu"
                  sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                >
                  <AddIcon />
                </IconButton>

                {/* Edit Menu Button */}
                <IconButton
                  color="default"
                  onClick={() => setMenuRenameDialog({
                    open: true,
                    menuId: selectedMenuId,
                    currentName: selectedMenu?.name || ''
                  })}
                  title="Rename Menu"
                  disabled={!selectedMenu}
                >
                  <EditIcon />
                </IconButton>

                {/* Delete Menu Button */}
                <IconButton
                  color="error"
                  onClick={() => setMenuDeleteConfirm({
                    open: true,
                    menuId: selectedMenuId,
                    menuName: selectedMenu?.name || ''
                  })}
                  title="Delete Menu"
                  disabled={!selectedMenu || menuData.menus.length <= 1}
                >
                  <DeleteIcon />
                </IconButton>

                {/* Reorder Up Button */}
                <IconButton
                  onClick={() => {
                    const currentIndex = menuData.menus.findIndex(m => m.id === selectedMenuId);
                    if (currentIndex > 0) {
                      reorderMenus(currentIndex, currentIndex - 1);
                    }
                  }}
                  title="Move Up"
                  disabled={!selectedMenu || menuData.menus.findIndex(m => m.id === selectedMenuId) === 0}
                >
                  <ArrowUpwardIcon />
                </IconButton>

                {/* Reorder Down Button */}
                <IconButton
                  onClick={() => {
                    const currentIndex = menuData.menus.findIndex(m => m.id === selectedMenuId);
                    if (currentIndex < menuData.menus.length - 1) {
                      reorderMenus(currentIndex, currentIndex + 1);
                    }
                  }}
                  title="Move Down"
                  disabled={!selectedMenu || menuData.menus.findIndex(m => m.id === selectedMenuId) === menuData.menus.length - 1}
                >
                  <ArrowDownwardIcon />
                </IconButton>
              </Box>
            </Box>
          </Paper>

        <Grid container spacing={3}>
          {/* Categories Sidebar */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Categories</Typography>
                <IconButton size="small" onClick={addCategory}><AddIcon /></IconButton>
              </Box>
              <Stack spacing={1}>
                {allCategories.map((category) => (
                  <Box
                    key={category.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: selectedCategoryId === category.id ? 'primary.light' : 'grey.100',
                      color: selectedCategoryId === category.id ? 'primary.contrastText' : 'text.primary',
                      '&:hover': { bgcolor: selectedCategoryId === category.id ? 'primary.light' : 'grey.200' },
                    }}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={500}>{category.name}</Typography>
                      <Typography variant="caption">({category.items?.length || 0})</Typography>
                    </Box>
                  </Box>
                ))}
                {allCategories.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <RestaurantMenuIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No categories yet
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addCategory}
                    >
                      Create First Category
                    </Button>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Items List */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ p: 2 }}>
              {currentCategory ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <TextField
                      value={currentCategory.name}
                      onChange={(e) => updateCategory(currentCategory.id, { name: e.target.value })}
                      variant="standard"
                      sx={{ '& input': { fontSize: '1.25rem', fontWeight: 600 } }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {/* Mark Category Reviewed Button - Phase 3.5-B */}
                      {currentCategory.items?.some(item => item.needs_review) && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => markCategoryReviewed(currentCategory.id)}
                        >
                          Mark All Reviewed
                        </Button>
                      )}
                      <Button startIcon={<AddIcon />} onClick={() => addItem(currentCategory.id)}>
                        Add Dish
                      </Button>
                      <IconButton color="error" onClick={() => deleteCategory(currentCategory.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider sx={{ mb: 2 }} />

                  {/* Filter indicator */}
                  {showOnlyNeedsReview && (
                    <Alert severity="info" sx={{ mb: 2 }} onClose={() => setShowOnlyNeedsReview(false)}>
                      Showing only items that need review. Click X to show all.
                    </Alert>
                  )}

                  <Stack spacing={2}>
                    {currentCategory.items
                      ?.filter(item => !showOnlyNeedsReview || item.needs_review)
                      .map((item) => (
                      <Card
                        key={item.id}
                        ref={(el) => {
                          if (el) itemRefs.current[item.id] = el;
                        }}
                        variant="outlined"
                        sx={{
                          borderColor: item.needs_review ? 'warning.main' : undefined,
                          borderWidth: item.needs_review ? 2 : 1,
                          bgcolor: item.needs_review ? 'warning.50' : undefined,
                          // Phase 3.5-B: Highlight effect when jumping to item
                          boxShadow: highlightedItemId === item.id ? '0 0 0 4px rgba(255, 193, 7, 0.4)' : undefined,
                          transition: 'box-shadow 0.3s ease',
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {item.needs_review && (
                                  <WarningAmberIcon color="warning" fontSize="small" />
                                )}
                                <Typography variant="subtitle1" fontWeight={600}>{item.name || 'Unnamed'}</Typography>
                                {!item.available && <Chip label="Unavailable" size="small" color="default" />}
                                {item.source === 'manual' && (
                                  <Chip label="Edited" size="small" color="primary" variant="outlined" />
                                )}
                                {item.source === 'parsed' && (
                                  <Chip label="Parsed" size="small" color="default" variant="outlined" />
                                )}
                              </Box>

                              {/* Review reasons */}
                              {item.needs_review && item.review_reasons?.length > 0 && (
                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                                  {item.review_reasons.map((reason, idx) => (
                                    <Chip key={idx} label={reason} size="small" color="warning" />
                                  ))}
                                </Stack>
                              )}

                              {item.description && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{item.description}</Typography>
                              )}
                              <Typography variant="subtitle2" color="primary.main" sx={{ mt: 0.5 }}>
                                {formatPrice(item, menuData.currency)}
                              </Typography>
                              {item.modifiers?.length > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Add-ons: {item.modifiers.map(m => `${m.name} (+$${m.price?.toFixed(2)})`).join(', ')}
                                </Typography>
                              )}
                              {/* Modifier Groups & Removable Ingredients Summary */}
                              {(item.modifier_groups?.length > 0 || item.removable_ingredients?.length > 0) && (
                                <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {item.modifier_groups?.length > 0 && (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      label={`${item.modifier_groups.length} modifier group${item.modifier_groups.length !== 1 ? 's' : ''}`}
                                    />
                                  )}
                                  {item.removable_ingredients?.length > 0 && (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      label={`${item.removable_ingredients.length} removable`}
                                    />
                                  )}
                                </Box>
                              )}
                              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                                {item.allergens?.map(a => (
                                  <Chip key={a} label={a} size="small" color="warning" variant="outlined" />
                                ))}
                                {item.dietary_tags?.map(t => (
                                  <Chip key={t} label={t} size="small" color="success" variant="outlined" />
                                ))}
                                {item.prep_methods?.map(m => (
                                  <Chip key={m} label={m} size="small" color="info" variant="outlined" />
                                ))}
                              </Stack>
                            </Box>
                            <Stack direction="row" alignItems="center">
                              {item.needs_review && (
                                <IconButton
                                  size="small"
                                  color="success"
                                  title="Mark as reviewed"
                                  onClick={() => markItemReviewed(currentCategory.id, item)}
                                >
                                  <CheckCircleIcon />
                                </IconButton>
                              )}
                              <IconButton size="small" onClick={() => setEditDialog({
                                open: true,
                                type: 'item',
                                data: { categoryId: currentCategory.id, item, isNew: false }
                              })}>
                                <EditIcon />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => deleteItem(currentCategory.id, item.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                    {(!currentCategory.items || currentCategory.items.length === 0) && (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <LocalOfferIcon sx={{ fontSize: 48, color: 'grey.300', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                          No dishes in this section yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Add menu items with prices, allergens, and modifiers
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => addItem(currentCategory.id)}
                        >
                          Add First Dish
                        </Button>
                      </Box>
                    )}
                    {showOnlyNeedsReview && currentCategory.items?.filter(i => i.needs_review).length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                        <Typography color="text.secondary">All items in this section have been reviewed!</Typography>
                      </Box>
                    )}
                  </Stack>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <RestaurantMenuIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                  <Typography color="text.secondary">Select or create a section to manage dishes</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
        </>
      )}

      {/* Specials Tab */}
      {activeTab === 1 && menuData && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Today's Specials</Typography>
            <Button startIcon={<AddIcon />} onClick={addSpecial}>Add Special</Button>
          </Box>
          <Stack spacing={2}>
            {menuData.specials?.map((special) => (
              <Card key={special.id} variant="outlined">
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{special.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{special.description}</Typography>
                      <Typography variant="subtitle2" color="secondary.main">{formatPrice(special, menuData.currency)}</Typography>
                      {special.available_days?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Available: {special.available_days.join(', ')}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row">
                      <IconButton size="small" onClick={() => setEditDialog({
                        open: true, type: 'special', data: { special, isNew: false }
                      })}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteSpecial(special.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            ))}
            {(!menuData.specials || menuData.specials.length === 0) && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No specials configured</Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Upsell Tips Tab */}
      {activeTab === 2 && menuData && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Upsell Tips for Servers</Typography>
            <Button startIcon={<AddIcon />} onClick={addUpsellTip}>Add Tip</Button>
          </Box>
          <Stack spacing={2}>
            {menuData.upsell_tips?.map((tip) => (
              <Card key={tip.id} variant="outlined" sx={{ opacity: tip.enabled ? 1 : 0.6 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{tip.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{tip.body}</Typography>
                    </Box>
                    <Stack direction="row" alignItems="center">
                      <FormControlLabel
                        control={<Switch checked={tip.enabled} onChange={(e) => saveUpsellTip({ ...tip, enabled: e.target.checked }, false)} />}
                        label=""
                      />
                      <IconButton size="small" onClick={() => setEditDialog({
                        open: true, type: 'upsell', data: { tip, isNew: false }
                      })}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteUpsellTip(tip.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            ))}
            {(!menuData.upsell_tips || menuData.upsell_tips.length === 0) && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No upsell tips configured</Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}

      {/* Restaurant Profile Tab */}
      {activeTab === 3 && restaurant && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Restaurant Profile</Typography>
          <Stack spacing={3}>
            <TextField
              label="Restaurant Name"
              fullWidth
              value={restaurant.name || ''}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
            />
            <TextField
              label="Address"
              fullWidth
              value={restaurant.address || ''}
              onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={restaurant.description || ''}
              onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })}
            />
            <Button
              variant="contained"
              onClick={() => saveRestaurantProfile({
                name: restaurant.name,
                address: restaurant.address,
                description: restaurant.description,
              })}
              disabled={saving}
            >
              Save Profile
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Edit Item Dialog */}
      <ItemEditDialog
        open={editDialog.open && editDialog.type === 'item'}
        data={editDialog.data}
        onClose={() => setEditDialog({ open: false, type: null, data: null })}
        onSave={saveItem}
        currency={menuData?.currency || 'USD'}
      />

      {/* Edit Special Dialog */}
      <SpecialEditDialog
        open={editDialog.open && editDialog.type === 'special'}
        data={editDialog.data}
        allItems={allItems}
        onClose={() => setEditDialog({ open: false, type: null, data: null })}
        onSave={saveSpecial}
      />

      {/* Edit Upsell Dialog */}
      <UpsellEditDialog
        open={editDialog.open && editDialog.type === 'upsell'}
        data={editDialog.data}
        onClose={() => setEditDialog({ open: false, type: null, data: null })}
        onSave={saveUpsellTip}
      />

      {/* Success Snackbar */}
      <Snackbar
        open={success !== null}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSuccess(null)}
          icon={<CheckCircleIcon />}
          sx={{ minWidth: 300 }}
        >
          {success}
        </Alert>
      </Snackbar>

      {/* Menu Rename Dialog */}
      <Dialog
        open={menuRenameDialog.open}
        onClose={() => setMenuRenameDialog({ open: false, menuId: null, currentName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Menu</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Menu Name"
            fullWidth
            value={menuRenameDialog.currentName}
            onChange={(e) => setMenuRenameDialog({ ...menuRenameDialog, currentName: e.target.value })}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && menuRenameDialog.currentName.trim()) {
                renameMenu(menuRenameDialog.menuId, menuRenameDialog.currentName);
                setMenuRenameDialog({ open: false, menuId: null, currentName: '' });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuRenameDialog({ open: false, menuId: null, currentName: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              renameMenu(menuRenameDialog.menuId, menuRenameDialog.currentName);
              setMenuRenameDialog({ open: false, menuId: null, currentName: '' });
            }}
            disabled={!menuRenameDialog.currentName.trim()}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu Delete Confirmation Dialog */}
      <Dialog
        open={menuDeleteConfirm.open}
        onClose={() => setMenuDeleteConfirm({ open: false, menuId: null, menuName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Menu?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the menu "{menuDeleteConfirm.menuName}"?
            This will permanently delete all categories and items in this menu.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuDeleteConfirm({ open: false, menuId: null, menuName: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              deleteMenu(menuDeleteConfirm.menuId);
              setMenuDeleteConfirm({ open: false, menuId: null, menuName: '' });
            }}
          >
            Delete Menu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Menu Dialog */}
      <Dialog
        open={importDialog.open}
        onClose={() => setImportDialog({
          open: false,
          rawText: '',
          targetMenuId: 'new',
          importMode: 'replace',
          preview: null
        })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Menu from Text</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Target Menu Selector */}
            <FormControl fullWidth>
              <InputLabel>Import Into</InputLabel>
              <Select
                value={importDialog.targetMenuId}
                label="Import Into"
                onChange={(e) => setImportDialog({ ...importDialog, targetMenuId: e.target.value, preview: null })}
              >
                <MenuItem value="new">
                  🆕 Create New Menu (auto-detect meal period)
                </MenuItem>
                {menuData?.menus?.map((menu) => (
                  <MenuItem key={menu.id} value={menu.id}>
                    📋 {menu.name || 'Unnamed Menu'} ({menu.categories?.length || 0} categories)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Import Mode (only show when targeting existing menu) */}
            {importDialog.targetMenuId !== 'new' && (
              <FormControl fullWidth>
                <InputLabel>Import Mode</InputLabel>
                <Select
                  value={importDialog.importMode}
                  label="Import Mode"
                  onChange={(e) => setImportDialog({ ...importDialog, importMode: e.target.value, preview: null })}
                >
                  <MenuItem value="replace">
                    🔄 Replace (Delete existing categories and replace with imported)
                  </MenuItem>
                  <MenuItem value="append">
                    ➕ Append (Add imported categories to existing)
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Warning for Replace mode */}
            {importDialog.targetMenuId !== 'new' && importDialog.importMode === 'replace' && (
              <Alert severity="error">
                <strong>⚠️ Warning:</strong> Replace mode will permanently delete all existing categories and items in "{selectedMenu?.name}". This action cannot be undone!
              </Alert>
            )}

            {/* Text Input */}
            <TextField
              label="Paste Menu Text"
              multiline
              rows={8}
              fullWidth
              value={importDialog.rawText}
              onChange={(e) => setImportDialog({ ...importDialog, rawText: e.target.value, preview: null })}
              placeholder="Paste your menu text here...&#10;&#10;APPETIZERS&#10;Wings - $12&#10;Nachos - $10&#10;&#10;ENTREES&#10;Steak - $30&#10;Salmon - Market Price"
              helperText="Paste menu text with categories and items. Parser will auto-detect sections, prices, and market price items."
            />

            {/* Preview Button */}
            <Button
              variant="outlined"
              onClick={handleImportPreview}
              disabled={!importDialog.rawText.trim()}
              fullWidth
            >
              Generate Preview
            </Button>

            {/* Preview Section */}
            {importDialog.preview && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  📊 Import Preview
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2"><strong>Menu Name:</strong></Typography>
                    <Typography variant="body2">{importDialog.preview.menuName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2"><strong>Categories:</strong></Typography>
                    <Typography variant="body2">{importDialog.preview.totalCategories}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2"><strong>Items:</strong></Typography>
                    <Typography variant="body2">{importDialog.preview.totalItems}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="warning.main"><strong>Needs Review:</strong></Typography>
                    <Typography variant="body2" color="warning.main">
                      {importDialog.preview.needsReviewCount} ({Math.round((importDialog.preview.needsReviewCount / importDialog.preview.totalItems) * 100)}%)
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2"><strong>Market Price Items:</strong></Typography>
                    <Typography variant="body2">{importDialog.preview.mpItemsCount}</Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog({
            open: false,
            rawText: '',
            targetMenuId: 'new',
            importMode: 'replace',
            preview: null
          })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImportApply}
            disabled={!importDialog.preview}
          >
            {importDialog.targetMenuId === 'new' ? 'Create Menu' : `Import to ${selectedMenu?.name}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Validation helper for Item Edit Dialog
const validateItem = (item) => {
  const errors = {};
  const warnings = {};

  // Name validation
  if (!item.name || item.name.trim().length === 0) {
    errors.name = 'Item name is required';
  } else if (item.name.trim().length < 2) {
    errors.name = 'Item name must be at least 2 characters';
  }

  // Price validation (unless Market Price)
  if (item.price_type !== 'MP') {
    if (item.price === null || item.price === undefined) {
      errors.price = 'Price is required (or mark as Market Price)';
    } else if (isNaN(item.price)) {
      errors.price = 'Price must be a valid number';
    } else if (item.price < 0) {
      errors.price = 'Price cannot be negative';
    }
  }

  // Description warning (not error) if allergens exist
  if ((item.allergens && item.allergens.length > 0) && (!item.description || item.description.trim().length === 0)) {
    warnings.description = 'Item has allergens but no description - consider adding ingredients for accuracy';
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
};

// Item Edit Dialog Component
const ItemEditDialog = ({ open, data, onClose, onSave, currency }) => {
  const [item, setItem] = useState(null);
  const [removableInput, setRemovableInput] = useState('');
  const [validation, setValidation] = useState({ errors: {}, warnings: {}, isValid: true });

  useEffect(() => {
    if (data?.item) {
      const itemData = {
        ...data.item,
        modifiers: data.item.modifiers || [],
        modifier_groups: data.item.modifier_groups || [],
        removable_ingredients: data.item.removable_ingredients || [],
        price_type: data.item.price_type || 'FIXED',
        source: data.item.source || 'parsed', // Track if parsed or manual
      };
      setItem(itemData);
      setRemovableInput('');
      setValidation(validateItem(itemData));
    }
  }, [data]);

  // Revalidate whenever item changes + mark as manual edit
  useEffect(() => {
    if (item && data?.item) {
      setValidation(validateItem(item));
      // Mark as manual if any field changed
      if (item.name !== data.item.name ||
          item.price !== data.item.price ||
          item.description !== data.item.description) {
        if (item.source === 'parsed') {
          setItem(prev => ({ ...prev, source: 'manual' }));
        }
      }
    }
  }, [item?.name, item?.price, item?.description, item?.price_type]);

  if (!item) return null;

  // Removable ingredients handlers
  const handleAddRemovable = () => {
    const updated = addRemovableIngredient(item.removable_ingredients || [], removableInput);
    if (updated !== item.removable_ingredients) {
      setItem({ ...item, removable_ingredients: updated });
      setRemovableInput('');
    }
  };

  const handleRemoveRemovable = (ingredient) => {
    setItem({
      ...item,
      removable_ingredients: item.removable_ingredients.filter(i => i !== ingredient),
    });
  };

  // Modifier Groups handlers
  const handleAddModifierGroup = () => {
    const newGroup = createEmptyModifierGroup((item.modifier_groups?.length || 0) + 1);
    setItem({
      ...item,
      modifier_groups: [...(item.modifier_groups || []), newGroup],
    });
  };

  const handleUpdateModifierGroup = (groupId, updates) => {
    setItem({
      ...item,
      modifier_groups: item.modifier_groups.map(g =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    });
  };

  const handleDeleteModifierGroup = (groupId) => {
    setItem({
      ...item,
      modifier_groups: item.modifier_groups.filter(g => g.id !== groupId),
    });
  };

  const handleAddModifierOption = (groupId) => {
    setItem({
      ...item,
      modifier_groups: item.modifier_groups.map(g => {
        if (g.id !== groupId) return g;
        const newOption = createEmptyModifierOption((g.options?.length || 0) + 1);
        return { ...g, options: [...(g.options || []), newOption] };
      }),
    });
  };

  const handleUpdateModifierOption = (groupId, optionId, updates) => {
    setItem({
      ...item,
      modifier_groups: item.modifier_groups.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map(o =>
            o.id === optionId ? { ...o, ...updates } : o
          ),
        };
      }),
    });
  };

  const handleDeleteModifierOption = (groupId, optionId) => {
    setItem({
      ...item,
      modifier_groups: item.modifier_groups.map(g => {
        if (g.id !== groupId) return g;
        return { ...g, options: g.options.filter(o => o.id !== optionId) };
      }),
    });
  };

  const toggleAllergen = (allergen) => {
    setItem({
      ...item,
      allergens: item.allergens?.includes(allergen)
        ? item.allergens.filter(a => a !== allergen)
        : [...(item.allergens || []), allergen],
    });
  };

  const toggleDietaryTag = (tag) => {
    setItem({
      ...item,
      dietary_tags: item.dietary_tags?.includes(tag)
        ? item.dietary_tags.filter(t => t !== tag)
        : [...(item.dietary_tags || []), tag],
    });
  };

  const togglePrepMethod = (method) => {
    setItem({
      ...item,
      prep_methods: item.prep_methods?.includes(method)
        ? item.prep_methods.filter(m => m !== method)
        : [...(item.prep_methods || []), method],
    });
  };

  const addModifier = () => {
    setItem({
      ...item,
      modifiers: [...(item.modifiers || []), { id: generateId(), name: '', price: 0 }],
    });
  };

  const updateModifier = (modId, field, value) => {
    setItem({
      ...item,
      modifiers: item.modifiers.map(m =>
        m.id === modId ? { ...m, [field]: value } : m
      ),
    });
  };

  const removeModifier = (modId) => {
    setItem({
      ...item,
      modifiers: item.modifiers.filter(m => m.id !== modId),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{data?.isNew ? 'Add Dish' : 'Edit Dish'}</span>
        <Chip
          label={item.source === 'manual' ? 'Manually Edited' : 'Parsed'}
          size="small"
          color={item.source === 'manual' ? 'primary' : 'default'}
          variant={item.source === 'manual' ? 'filled' : 'outlined'}
        />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Name Field with Validation */}
          <TextField
            label="Name"
            fullWidth
            required
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            error={!!validation.errors.name}
            helperText={validation.errors.name}
          />

          {/* Description Field with Warning */}
          <TextField
            label="Description / Ingredients"
            fullWidth
            multiline
            rows={2}
            value={item.description}
            onChange={(e) => setItem({ ...item, description: e.target.value })}
            helperText={validation.warnings.description || "Include ingredients for accurate allergy chat responses"}
            FormHelperTextProps={{
              sx: validation.warnings.description ? { color: 'warning.main' } : {}
            }}
          />

          {/* Price Type Toggle */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Price Type</Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label="Fixed Price"
                color={item.price_type === 'FIXED' ? 'primary' : 'default'}
                variant={item.price_type === 'FIXED' ? 'filled' : 'outlined'}
                onClick={() => setItem({ ...item, price_type: 'FIXED' })}
              />
              <Chip
                label="Market Price (MP)"
                color={item.price_type === 'MP' ? 'secondary' : 'default'}
                variant={item.price_type === 'MP' ? 'filled' : 'outlined'}
                onClick={() => setItem({ ...item, price_type: 'MP', price: null })}
              />
            </Stack>
          </Box>

          {/* Price Field (only if FIXED) */}
          {item.price_type === 'FIXED' && (
            <TextField
              label="Base Price"
              type="number"
              fullWidth
              required
              value={item.price || ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setItem({ ...item, price: isNaN(value) ? null : value });
              }}
              error={!!validation.errors.price}
              helperText={validation.errors.price}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency === 'USD' ? '$' : currency}</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
            />
          )}

          {/* MP Display */}
          {item.price_type === 'MP' && (
            <Alert severity="info">
              Price marked as Market Price (MP) - no fixed price needed
            </Alert>
          )}
          <FormControlLabel
            control={<Switch checked={item.available} onChange={(e) => setItem({ ...item, available: e.target.checked })} />}
            label="Available"
          />

          {/* Modifiers Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Modifiers / Add-ons</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addModifier}>Add</Button>
            </Box>
            {item.modifiers?.length > 0 ? (
              <Stack spacing={1}>
                {item.modifiers.map((mod) => (
                  <Box key={mod.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      placeholder="e.g., with chicken"
                      value={mod.name}
                      onChange={(e) => updateModifier(mod.id, 'name', e.target.value)}
                      sx={{ flex: 2 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Extra $"
                      value={mod.price}
                      onChange={(e) => updateModifier(mod.id, 'price', parseFloat(e.target.value) || 0)}
                      InputProps={{ startAdornment: <InputAdornment position="start">+$</InputAdornment> }}
                      sx={{ flex: 1 }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeModifier(mod.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No modifiers. Add upgrades like "with chicken +$5" here.
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Allergens</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {ALLERGEN_OPTIONS.map(a => (
                <Chip
                  key={a}
                  label={a}
                  size="small"
                  color={item.allergens?.includes(a) ? 'warning' : 'default'}
                  variant={item.allergens?.includes(a) ? 'filled' : 'outlined'}
                  onClick={() => toggleAllergen(a)}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Dietary Tags</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {DIETARY_TAG_OPTIONS.map(t => (
                <Chip
                  key={t}
                  label={t}
                  size="small"
                  color={item.dietary_tags?.includes(t) ? 'success' : 'default'}
                  variant={item.dietary_tags?.includes(t) ? 'filled' : 'outlined'}
                  onClick={() => toggleDietaryTag(t)}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Prep Methods</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {PREP_METHOD_OPTIONS.map(m => (
                <Chip
                  key={m}
                  label={m}
                  size="small"
                  color={item.prep_methods?.includes(m) ? 'info' : 'default'}
                  variant={item.prep_methods?.includes(m) ? 'filled' : 'outlined'}
                  onClick={() => togglePrepMethod(m)}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </Stack>
          </Box>

          {/* Removable Ingredients */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Removable Ingredients</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Ingredients guests can request to have removed (e.g., "no onions")
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                placeholder="e.g., onions, cilantro, cheese"
                value={removableInput}
                onChange={(e) => setRemovableInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRemovable();
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddRemovable}
                disabled={!removableInput.trim()}
              >
                Add
              </Button>
            </Box>
            {item.removable_ingredients?.length > 0 ? (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {item.removable_ingredients.map((ing, idx) => (
                  <Chip
                    key={idx}
                    label={ing}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    onDelete={() => handleRemoveRemovable(ing)}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No removable ingredients specified.
              </Typography>
            )}
          </Box>

          {/* Modifier Groups */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Modifier Groups</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddModifierGroup}>
                Add Group
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Groups of options guests can choose from (e.g., "Choose your protein", "Select toppings")
            </Typography>

            {item.modifier_groups?.length > 0 ? (
              <Stack spacing={2}>
                {item.modifier_groups.map((group) => {
                  const validation = validateModifierGroup(group);
                  return (
                    <Paper key={group.id} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <TextField
                          size="small"
                          placeholder="Group name (e.g., Choose protein)"
                          value={group.name}
                          onChange={(e) => handleUpdateModifierGroup(group.id, { name: e.target.value })}
                          sx={{ flex: 1, mr: 1 }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleDeleteModifierGroup(group.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Grid container spacing={1} sx={{ mb: 1 }}>
                        <Grid item xs={6}>
                          <FormControl size="small" fullWidth>
                            <InputLabel>Selection Type</InputLabel>
                            <Select
                              value={group.selection_type}
                              label="Selection Type"
                              onChange={(e) => {
                                const newType = e.target.value;
                                handleUpdateModifierGroup(group.id, {
                                  selection_type: newType,
                                  max_select: newType === 'SINGLE' ? 1 : group.max_select,
                                });
                              }}
                            >
                              <MenuItem value="SINGLE">Single (pick one)</MenuItem>
                              <MenuItem value="MULTIPLE">Multiple (pick many)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            size="small"
                            type="number"
                            label="Min"
                            value={group.min_select}
                            onChange={(e) => handleUpdateModifierGroup(group.id, { min_select: parseInt(e.target.value) || 0 })}
                            inputProps={{ min: 0 }}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={3}>
                          <TextField
                            size="small"
                            type="number"
                            label="Max"
                            value={group.max_select}
                            onChange={(e) => handleUpdateModifierGroup(group.id, { max_select: parseInt(e.target.value) || 1 })}
                            inputProps={{ min: 1 }}
                            fullWidth
                            disabled={group.selection_type === 'SINGLE'}
                          />
                        </Grid>
                      </Grid>

                      <FormControlLabel
                        control={
                          <Switch
                            size="small"
                            checked={group.required}
                            onChange={(e) => handleUpdateModifierGroup(group.id, {
                              required: e.target.checked,
                              min_select: e.target.checked && group.min_select < 1 ? 1 : group.min_select,
                            })}
                          />
                        }
                        label={<Typography variant="body2">Required</Typography>}
                      />

                      {/* Options */}
                      <Box sx={{ mt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="caption" fontWeight={600}>Options</Typography>
                          <Button size="small" onClick={() => handleAddModifierOption(group.id)}>+ Add Option</Button>
                        </Box>
                        {group.options?.length > 0 ? (
                          <Stack spacing={0.5}>
                            {group.options.map((opt) => (
                              <Box key={opt.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                  size="small"
                                  placeholder="Option name"
                                  value={opt.name}
                                  onChange={(e) => handleUpdateModifierOption(group.id, opt.id, { name: e.target.value })}
                                  sx={{ flex: 2 }}
                                />
                                <TextField
                                  size="small"
                                  type="number"
                                  placeholder="+$"
                                  value={opt.price_delta}
                                  onChange={(e) => handleUpdateModifierOption(group.id, opt.id, { price_delta: parseFloat(e.target.value) || 0 })}
                                  InputProps={{ startAdornment: <InputAdornment position="start">+$</InputAdornment> }}
                                  sx={{ flex: 1 }}
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      size="small"
                                      checked={opt.is_default}
                                      onChange={(e) => handleUpdateModifierOption(group.id, opt.id, { is_default: e.target.checked })}
                                    />
                                  }
                                  label={<Typography variant="caption">Default</Typography>}
                                  sx={{ m: 0, minWidth: 70 }}
                                />
                                <IconButton size="small" color="error" onClick={() => handleDeleteModifierOption(group.id, opt.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No options yet. Add options for guests to choose from.
                          </Typography>
                        )}
                      </Box>

                      {/* Validation errors */}
                      {!validation.valid && (
                        <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                          <Typography variant="caption">{validation.errors.join('; ')}</Typography>
                        </Alert>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No modifier groups. Add groups like "Choose your size" or "Select toppings".
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(data.categoryId, item, data.isNew)}
          disabled={!validation.isValid}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Special Edit Dialog Component with Combo Selector
const SpecialEditDialog = ({ open, data, allItems, onClose, onSave }) => {
  const [special, setSpecial] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (data?.special) {
      setSpecial({ ...data.special });
      // Set initial input value based on existing special
      if (data.special.dish_id) {
        const linkedItem = allItems.find(i => i.id === data.special.dish_id);
        setInputValue(linkedItem?.name || data.special.name || '');
      } else {
        setInputValue(data.special.name || '');
      }
    }
  }, [data, allItems]);

  if (!special) return null;

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const toggleDay = (day) => {
    setSpecial({
      ...special,
      available_days: special.available_days?.includes(day)
        ? special.available_days.filter(d => d !== day)
        : [...(special.available_days || []), day],
    });
  };

  // Handle selection from autocomplete
  const handleItemSelect = (event, newValue) => {
    if (newValue && typeof newValue === 'object') {
      // Selected an existing menu item
      setSpecial({
        ...special,
        name: newValue.name,
        dish_id: newValue.id,
        price: newValue.price || special.price,
        description: newValue.description || special.description,
      });
      setInputValue(newValue.name);
    } else if (typeof newValue === 'string') {
      // Custom typed value
      setSpecial({
        ...special,
        name: newValue,
        dish_id: null,
      });
      setInputValue(newValue);
    } else {
      // Cleared
      setSpecial({
        ...special,
        name: '',
        dish_id: null,
      });
      setInputValue('');
    }
  };

  // Handle typing in the input
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    // If typing a custom value (not selecting from dropdown)
    if (!allItems.find(i => i.name === newInputValue)) {
      setSpecial({
        ...special,
        name: newInputValue,
        dish_id: null,
      });
    }
  };

  // Get display value for autocomplete
  const getOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    return option.name || '';
  };

  // Check if option matches input
  const filterOptions = (options, { inputValue }) => {
    const filtered = options.filter(option =>
      option.name.toLowerCase().includes(inputValue.toLowerCase())
    );
    return filtered;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data?.isNew ? 'Add Special' : 'Edit Special'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Combo selector: typeahead from menu items OR type custom */}
          <Autocomplete
            freeSolo
            options={allItems}
            getOptionLabel={getOptionLabel}
            filterOptions={filterOptions}
            value={special.dish_id ? allItems.find(i => i.id === special.dish_id) || null : null}
            inputValue={inputValue}
            onChange={handleItemSelect}
            onInputChange={handleInputChange}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>{option.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${option.price?.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Special Name"
                placeholder="Select from menu or type custom..."
                helperText={special.dish_id ? 'Linked to menu item' : 'Custom special (not on menu)'}
              />
            )}
          />

          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={special.description || ''}
            onChange={(e) => setSpecial({ ...special, description: e.target.value })}
            placeholder="Chef's special soup of the day..."
          />

          <TextField
            label="Special Price"
            type="number"
            fullWidth
            required={!special.dish_id}
            error={!special.dish_id && !special.price}
            value={special.price || ''}
            onChange={(e) => setSpecial({ ...special, price: parseFloat(e.target.value) || 0 })}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            helperText={!special.dish_id && !special.price ? 'Price required for custom specials' : (special.dish_id ? 'Override price (leave 0 to use menu price)' : 'Price for this special')}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Available Days (leave empty for all days)</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {DAYS.map(day => (
                <Chip
                  key={day}
                  label={day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  size="small"
                  color={special.available_days?.includes(day) ? 'primary' : 'default'}
                  variant={special.available_days?.includes(day) ? 'filled' : 'outlined'}
                  onClick={() => toggleDay(day)}
                />
              ))}
            </Stack>
          </Box>

          {special.dish_id && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Linked to "{allItems.find(i => i.id === special.dish_id)?.name}". Allergens and dietary tags will be inherited.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(special, data.isNew)}
          disabled={!special.name || (!special.dish_id && !special.price)}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Upsell Edit Dialog Component
const UpsellEditDialog = ({ open, data, onClose, onSave }) => {
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (data?.tip) {
      setTip({ ...data.tip });
    }
  }, [data]);

  if (!tip) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{data?.isNew ? 'Add Upsell Tip' : 'Edit Upsell Tip'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            fullWidth
            value={tip.title}
            onChange={(e) => setTip({ ...tip, title: e.target.value })}
          />
          <TextField
            label="Body"
            fullWidth
            multiline
            rows={3}
            value={tip.body}
            onChange={(e) => setTip({ ...tip, body: e.target.value })}
          />
          <TextField
            label="Display Order"
            type="number"
            fullWidth
            value={tip.display_order}
            onChange={(e) => setTip({ ...tip, display_order: parseInt(e.target.value) || 1 })}
          />
          <FormControlLabel
            control={<Switch checked={tip.enabled} onChange={(e) => setTip({ ...tip, enabled: e.target.checked })} />}
            label="Enabled"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(tip, data.isNew)} disabled={!tip.title}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MenuManagerScreen;
