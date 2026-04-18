import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Collapse,
  Badge,
} from '@mui/material';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import SearchIcon from '@mui/icons-material/Search';
import WarningIcon from '@mui/icons-material/Warning';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';

// Common allergens for quick filtering
const COMMON_ALLERGENS = [
  { label: 'Gluten', color: 'warning' },
  { label: 'Dairy', color: 'info' },
  { label: 'Nuts', color: 'error' },
  { label: 'Shellfish', color: 'secondary' },
  { label: 'Eggs', color: 'warning' },
  { label: 'Soy', color: 'success' },
  { label: 'Vegan', color: 'success' },
  { label: 'Vegetarian', color: 'primary' },
];

// Ingredient keywords that indicate allergen presence (for scanning descriptions)
const ALLERGEN_KEYWORDS = {
  Gluten: ['bread', 'flour', 'wheat', 'pasta', 'noodle', 'tortilla', 'bun', 'crouton', 'breaded', 'panko', 'roux', 'soy sauce', 'teriyaki', 'tempura', 'croissant', 'bagel', 'roll', 'pita', 'brioche', 'crust', 'toast', 'sandwich'],
  Dairy: ['cheese', 'cream', 'milk', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'cheddar', 'brie', 'gouda', 'feta', 'ricotta', 'mascarpone', 'whey', 'casein', 'ghee', 'burrata', 'provolone', 'gruyere', 'swiss', 'blue cheese', 'gorgonzola', 'ranch', 'alfredo', 'queso', 'crema', 'sour cream', 'ice cream', 'gelato', 'parm'],
  Nuts: ['nut', 'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut', 'peanut', 'macadamia', 'pine nut', 'praline', 'marzipan', 'nougat', 'pesto'],
  Eggs: ['egg', 'mayo', 'mayonnaise', 'aioli', 'hollandaise', 'custard', 'meringue', 'mousse', 'frittata', 'quiche', 'carbonara', 'caesar dressing', 'remoulade', 'tartar sauce'],
  Shellfish: ['shrimp', 'crab', 'lobster', 'crawfish', 'crayfish', 'prawn', 'scallop', 'clam', 'mussel', 'oyster', 'calamari', 'squid', 'octopus'],
  Fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass', 'snapper', 'mahi', 'swordfish', 'anchovy', 'sardine', 'mackerel', 'caviar', 'roe'],
  Soy: ['soy', 'tofu', 'edamame', 'miso', 'tempeh', 'soy sauce', 'teriyaki'],
  Sesame: ['sesame', 'tahini', 'hummus', 'halvah'],
};

// Check if text contains any allergen keywords
const textContainsAllergen = (text, allergen) => {
  if (!text || !ALLERGEN_KEYWORDS[allergen]) return false;
  const lowerText = text.toLowerCase();
  return ALLERGEN_KEYWORDS[allergen].some(keyword => lowerText.includes(keyword));
};

// Get all allergens detected in item (both tagged and inferred from text)
const getItemAllergens = (item) => {
  const tagged = item.allergens || [];
  const inferred = [];

  const textToScan = `${item.name || ''} ${item.description || ''}`.toLowerCase();

  Object.keys(ALLERGEN_KEYWORDS).forEach(allergen => {
    // Skip if already tagged
    if (tagged.some(t => t.toLowerCase() === allergen.toLowerCase())) return;

    if (ALLERGEN_KEYWORDS[allergen].some(keyword => textToScan.includes(keyword))) {
      inferred.push(allergen);
    }
  });

  return { tagged, inferred };
};

const ServerDashboardScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useContext(UserContext);
  const restaurantId = location.state?.restaurantId;
  const restaurantName = location.state?.restaurantName;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [selectedDietary, setSelectedDietary] = useState([]);
  const [selectedPrepMethods, setSelectedPrepMethods] = useState([]);
  const [showMPOnly, setShowMPOnly] = useState(false);
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);
  const [menuData, setMenuData] = useState(null); // Store full menu_data structure
  const [selectedMenuId, setSelectedMenuId] = useState(() => {
    // Restore from localStorage if available
    const stored = localStorage.getItem(`serverDashboard_selectedMenu_${restaurantId}`);
    return stored || null;
  });
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    // Restore collapsed state from localStorage
    if (restaurantId != null && selectedMenuId != null) {
      const stored = localStorage.getItem(`serverDashboard_collapsed_${restaurantId}_${selectedMenuId}`);
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });
  const [specials, setSpecials] = useState([]);
  const [upsellTips, setUpsellTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get selected menu (default to first if not set)
  const activeMenu = menuData?.menus?.find(m => m.id === selectedMenuId) || menuData?.menus?.[0];

  // Extract items from selected menu only
  const menuItems = React.useMemo(() => {
    if (!activeMenu || !activeMenu.categories) return [];

    const items = [];
    activeMenu.categories.forEach((category) => {
      if (category.items) {
        category.items.forEach((item) => {
          if (item.available !== false) {
            items.push({
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              price_type: item.price_type || 'FIXED',
              prep_methods: item.prep_methods || [],
              allergens: (item.allergens || []).map(a =>
                a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()
              ),
              tags: (item.dietary_tags || []).map(t =>
                t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
              ),
              needs_review: item.needs_review || false,
              category: category.name,
              categoryId: category.id,
              menu: activeMenu.name,
            });
          }
        });
      }
    });
    return items;
  }, [activeMenu]);

  // Persist collapsed categories to localStorage
  useEffect(() => {
    if (restaurantId != null && selectedMenuId != null) {
      localStorage.setItem(
        `serverDashboard_collapsed_${restaurantId}_${selectedMenuId}`,
        JSON.stringify(collapsedCategories)
      );
    }
  }, [collapsedCategories, restaurantId, selectedMenuId]);

  // Persist selectedMenuId to localStorage
  useEffect(() => {
    if (selectedMenuId != null && restaurantId != null) {
      localStorage.setItem(`serverDashboard_selectedMenu_${restaurantId}`, selectedMenuId);
      console.log('[ServerDashboard] Menu selected:', {
        menuId: selectedMenuId,
        menuName: activeMenu?.name,
        itemCount: menuItems.length
      });
    }
  }, [selectedMenuId, restaurantId, activeMenu, menuItems.length]);

  useEffect(() => {
    const loadData = async () => {
      if (!restaurantId && restaurantId !== 0) {
        setError('No restaurant selected');
        setLoading(false);
        return;
      }

      try {
        const data = await dataService.getRestaurant(restaurantId);

        if (!data || data.error) {
          setError(data?.error || 'Failed to load restaurant data');
          setLoading(false);
          return;
        }

        // Load menu_data (V2 format)
        if (data.menus && data.menus.length > 0) {
          const firstMenu = data.menus[0];
          const loadedMenuData = firstMenu.menu_data;

          // Backend returns menu_data as object (not string)
          // Validate V2 format
          try {
            assertMenuDataV2(loadedMenuData);
          } catch (validationErr) {
            console.error('[ServerDashboard] Menu data validation failed:', validationErr);
            setError(getFriendlyErrorMessage(validationErr));
            setLoading(false);
            return;
          }

          setMenuData(loadedMenuData);

          // Set default menu selection if not already set
          if (!selectedMenuId && loadedMenuData.menus && loadedMenuData.menus.length > 0) {
            const firstMenuInData = loadedMenuData.menus[0];
            setSelectedMenuId(firstMenuInData.id);
            console.log('[ServerDashboard] Default menu selected:', {
              menuId: firstMenuInData.id,
              menuName: firstMenuInData.name
            });
          }

          // Extract specials (global, not per-menu)
          if (loadedMenuData?.specials) {
            const allSpecials = loadedMenuData.specials.map((special) => ({
              id: special.id,
              name: special.name,
              description: special.description || '',
              price: formatPrice(special.price, loadedMenuData.currency, special.price_type),
              available_days: special.available_days || [],
            }));
            setSpecials(allSpecials);
          }

          // Extract upsell tips (global, not per-menu)
          if (loadedMenuData?.upsell_tips) {
            const enabledTips = loadedMenuData.upsell_tips
              .filter(tip => tip.enabled !== false)
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            setUpsellTips(enabledTips);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading restaurant data:', err);
        setError('Failed to load menu data');
        setLoading(false);
      }
    };

    loadData();
  }, [restaurantId]);

  const formatPrice = (price, currency = 'USD', priceType = 'FIXED') => {
    // Handle Market Price items
    if (priceType === 'MP' || price === null) {
      return 'MP';
    }
    if (typeof price !== 'number') return price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const toggleAllergen = (allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const toggleDietary = (tag) => {
    setSelectedDietary((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const togglePrepMethod = (method) => {
    setSelectedPrepMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const expandAll = () => {
    setCollapsedCategories({});
  };

  const collapseAll = () => {
    if (!activeMenu || !activeMenu.categories) return;
    const allCollapsed = {};
    activeMenu.categories.forEach(cat => {
      allCollapsed[cat.id] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedAllergens([]);
    setSelectedDietary([]);
    setSelectedPrepMethods([]);
    setShowMPOnly(false);
    setShowNeedsReviewOnly(false);
  };

  // Comprehensive filter logic with AND combination across groups
  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      // 1. Search (name OR description)
      const matchesSearch = searchQuery.trim()
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      // 2. Allergen filter (ANY match - show items that contain ANY selected allergen)
      const matchesAllergens = selectedAllergens.length > 0
        ? selectedAllergens.some((allergen) => {
            const hasTaggedAllergen = item.allergens?.some(a =>
              a.toLowerCase() === allergen.toLowerCase()
            );
            const hasAllergenInText = textContainsAllergen(item.name, allergen) ||
                                      textContainsAllergen(item.description, allergen);
            // For dietary tags (Vegan, Vegetarian), show items that HAVE the tag
            if (['Vegan', 'Vegetarian'].includes(allergen)) {
              return item.tags?.some(t => t.toLowerCase() === allergen.toLowerCase());
            }
            // For allergens, show items that HAVE the allergen (warning purpose)
            return hasTaggedAllergen || hasAllergenInText;
          })
        : true;

      // 3. Dietary tag filter (ANY match)
      const matchesDietary = selectedDietary.length > 0
        ? selectedDietary.some((tag) =>
            item.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
          )
        : true;

      // 4. Prep method filter (ANY match)
      const matchesPrepMethods = selectedPrepMethods.length > 0
        ? selectedPrepMethods.some((method) =>
            item.prep_methods?.some(m => m.toLowerCase() === method.toLowerCase())
          )
        : true;

      // 5. MP only toggle
      const matchesMP = showMPOnly ? item.price_type === 'MP' : true;

      // 6. Needs review only toggle
      const matchesNeedsReview = showNeedsReviewOnly ? item.needs_review === true : true;

      // AND combination across all filter groups
      return matchesSearch && matchesAllergens && matchesDietary && matchesPrepMethods && matchesMP && matchesNeedsReview;
    });
  }, [menuItems, searchQuery, selectedAllergens, selectedDietary, selectedPrepMethods, showMPOnly, showNeedsReviewOnly]);

  // Derive available dietary tags and prep methods from current menu items
  const availableDietaryTags = React.useMemo(() => {
    const tags = new Set();
    menuItems.forEach(item => {
      item.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [menuItems]);

  const availablePrepMethods = React.useMemo(() => {
    const methods = new Set();
    menuItems.forEach(item => {
      item.prep_methods?.forEach(method => methods.add(method));
    });
    return Array.from(methods).sort();
  }, [menuItems]);

  // Group filtered items by category
  const itemsByCategory = React.useMemo(() => {
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
    return grouped;
  }, [filteredItems]);

  // Check if today matches special's available days
  const isSpecialAvailableToday = (special) => {
    if (!special.available_days || special.available_days.length === 0) {
      return true; // Always available if no days specified
    }
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return special.available_days.some(day => day.toLowerCase() === today);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading menu data...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const todaysSpecials = specials.filter(isSpecialAvailableToday);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            variant="text"
          >
            Back
          </Button>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'info.main',
              mx: 'auto',
              mb: 2,
            }}
          >
            <RoomServiceIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Server Assistant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {restaurantName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {menuItems.length} menu items loaded
          </Typography>
        </Box>
      </Paper>

      {/* Menu Selector */}
      {menuData?.menus && menuData.menus.length > 1 && (
        <Paper sx={{ mb: 3, p: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Current Menu Period</InputLabel>
            <Select
              value={selectedMenuId || ''}
              label="Current Menu Period"
              onChange={(e) => {
                const newMenuId = e.target.value;
                setSelectedMenuId(newMenuId);
                const newMenu = menuData.menus.find(m => m.id === newMenuId);
                console.log('[ServerDashboard] Menu switched:', {
                  menuId: newMenuId,
                  menuName: newMenu?.name,
                  categoryCount: newMenu?.categories?.length || 0,
                  itemCount: newMenu?.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0
                });
              }}
            >
              {menuData.menus.map((menu) => {
                const itemCount = menu.categories?.reduce((sum, cat) => sum + (cat.items?.length || 0), 0) || 0;
                return (
                  <MenuItem key={menu.id} value={menu.id}>
                    {menu.name || 'Unnamed Menu'} ({itemCount} items)
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Paper>
      )}

      {/* Empty State for Menu with No Items */}
      {activeMenu && (!activeMenu.categories || activeMenu.categories.length === 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          The "{activeMenu.name}" menu has no items yet. Please add items in the Menu Manager.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Filters & Menu */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Menu Items
                </Typography>
                <Chip
                  label={`${filteredItems.length} of ${menuItems.length}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={expandAll} variant="outlined">
                  Expand All
                </Button>
                <Button size="small" onClick={collapseAll} variant="outlined">
                  Collapse All
                </Button>
              </Box>
            </Box>

            {/* Search Field */}
            <TextField
              fullWidth
              placeholder="Search menu items by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Allergen Filter Chips */}
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Allergens & Dietary:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {COMMON_ALLERGENS.map((allergen) => (
                <Chip
                  key={allergen.label}
                  label={allergen.label}
                  color={selectedAllergens.includes(allergen.label) ? allergen.color : 'default'}
                  variant={selectedAllergens.includes(allergen.label) ? 'filled' : 'outlined'}
                  onClick={() => toggleAllergen(allergen.label)}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>

            {/* Dietary Tags Filter (if any exist in menu) */}
            {availableDietaryTags.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Dietary Tags:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {availableDietaryTags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      color={selectedDietary.includes(tag) ? 'success' : 'default'}
                      variant={selectedDietary.includes(tag) ? 'filled' : 'outlined'}
                      onClick={() => toggleDietary(tag)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              </>
            )}

            {/* Prep Methods Filter (if any exist in menu) */}
            {availablePrepMethods.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Preparation Methods:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {availablePrepMethods.map((method) => (
                    <Chip
                      key={method}
                      label={method}
                      color={selectedPrepMethods.includes(method) ? 'info' : 'default'}
                      variant={selectedPrepMethods.includes(method) ? 'filled' : 'outlined'}
                      onClick={() => togglePrepMethod(method)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>
              </>
            )}

            {/* Toggle Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showMPOnly}
                    onChange={(e) => setShowMPOnly(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Market Price Only"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showNeedsReviewOnly}
                    onChange={(e) => setShowNeedsReviewOnly(e.target.checked)}
                    color="warning"
                  />
                }
                label="Needs Review Only"
              />
            </Box>

            {/* Clear Filters Button (shown when any filters are active) */}
            {(searchQuery || selectedAllergens.length > 0 || selectedDietary.length > 0 ||
              selectedPrepMethods.length > 0 || showMPOnly || showNeedsReviewOnly) && (
              <Button
                variant="outlined"
                onClick={clearAllFilters}
                fullWidth
                sx={{ mb: 2 }}
              >
                Clear All Filters
              </Button>
            )}

            {/* No Menu Data Warning */}
            {menuItems.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No menu items found. Please ensure the menu has been set up in the Menu Manager.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Empty State - No Results */}
            {filteredItems.length === 0 && menuItems.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No items match your filters. Try adjusting your search or clearing filters.
              </Alert>
            )}

            {/* Category-Grouped Items */}
            {activeMenu?.categories?.map((category) => {
              const categoryData = itemsByCategory[category.id];
              if (!categoryData || categoryData.items.length === 0) return null;

              const isCollapsed = collapsedCategories[category.id];
              const itemCount = categoryData.items.length;

              return (
                <Box key={category.id} sx={{ mb: 3 }}>
                  {/* Category Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'grey.100',
                      p: 1.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'grey.200' },
                    }}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {category.name}
                      </Typography>
                      <Chip
                        label={itemCount}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <IconButton size="small">
                      {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                    </IconButton>
                  </Box>

                  {/* Category Items */}
                  <Collapse in={!isCollapsed} timeout="auto">
                    <List sx={{ pt: 1 }}>
                      {categoryData.items.map((item) => {
                        const { tagged, inferred } = getItemAllergens(item);
                        const hasAnyAllergen = tagged.length > 0 || inferred.length > 0;

                        return (
                          <ListItem
                            key={item.id}
                            sx={{
                              bgcolor: item.needs_review ? 'warning.50' : 'grey.50',
                              borderRadius: 2,
                              mb: 1,
                              border: item.needs_review ? '1px solid' : 'none',
                              borderColor: item.needs_review ? 'warning.main' : 'transparent',
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography fontWeight={500}>{item.name}</Typography>
                                    {item.needs_review && (
                                      <Chip
                                        label="Needs Review"
                                        size="small"
                                        color="warning"
                                        variant="filled"
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                    {formatPrice(item.price, menuData?.currency || 'USD', item.price_type)}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box>
                                  {item.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                      {item.description}
                                    </Typography>
                                  )}
                                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                                    {/* ALLERGENS FIRST - Bold, filled variant for visibility */}
                                    {tagged.map((a) => (
                                      <Chip
                                        key={a}
                                        label={a}
                                        size="small"
                                        variant="filled"
                                        color="error"
                                        sx={{ mb: 0.5, fontWeight: 700 }}
                                      />
                                    ))}
                                    {inferred.map((a) => (
                                      <Chip
                                        key={`inferred-${a}`}
                                        label={`${a}*`}
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        sx={{ mb: 0.5, fontStyle: 'italic' }}
                                        title="Detected from description"
                                      />
                                    ))}
                                    {!hasAnyAllergen && !item.tags?.length && (
                                      <Chip label="No common allergens" size="small" color="success" sx={{ mb: 0.5 }} />
                                    )}

                                    {/* Prep Methods - visible and clear */}
                                    {item.prep_methods && item.prep_methods.length > 0 && item.prep_methods.map((method) => (
                                      <Chip
                                        key={method}
                                        label={method}
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        sx={{ mb: 0.5 }}
                                      />
                                    ))}

                                    {/* Dietary tags - secondary priority */}
                                    {item.tags?.length > 0 && item.tags.map((t) => (
                                      <Chip key={t} label={t} size="small" color="success" variant="outlined" sx={{ mb: 0.5 }} />
                                    ))}
                                  </Stack>
                                </Box>
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </Paper>
        </Grid>

        {/* Right Column - Specials & Upsell */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WhatshotIcon color="secondary" />
              <Typography variant="h6" fontWeight={600}>
                Today's Specials
              </Typography>
            </Box>

            {todaysSpecials.length > 0 ? (
              <Stack spacing={2}>
                {todaysSpecials.map((special) => (
                  <Card key={special.id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {special.name}
                      </Typography>
                      {special.description && (
                        <Typography variant="body2" color="text.secondary">
                          {special.description}
                        </Typography>
                      )}
                      {special.price && (
                        <Typography variant="subtitle2" color="secondary.main" sx={{ mt: 0.5 }}>
                          {special.price}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No specials for today. Check Menu Manager to add specials.
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Upsell Tips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalOfferIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Upsell Tips
              </Typography>
            </Box>
            {upsellTips.length > 0 ? (
              <List dense>
                {upsellTips.map((tip) => (
                  <ListItem key={tip.id}>
                    <ListItemText
                      primary={tip.title}
                      secondary={tip.body}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No upsell tips configured. Add tips in Menu Manager to help your servers.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ServerDashboardScreen;
