import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  Paper,
  Stack,
  InputAdornment,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SortIcon from '@mui/icons-material/Sort';
import { getTagCategoryLabel, getTagChipIcon, getTagChipSx, getTagTone } from '../utils/tagVisuals';

// Cuisine types available for filtering
const CUISINE_TYPES = [
  { value: 'all', label: 'All Cuisines' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Mexican', label: 'Mexican' },
  { value: 'Chinese', label: 'Chinese' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Indian', label: 'Indian' },
  { value: 'American', label: 'American' },
  { value: 'Mediterranean', label: 'Mediterranean' },
  { value: 'French', label: 'French' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Vietnamese', label: 'Vietnamese' },
];

const DEFAULT_DIETARY_TAG_LABELS = [
  'Recommended',
  'Nut-Free Recommended',
  'Dairy-Free Recommended',
  'Egg-Free Recommended',
  'Gluten-Free Recommended',
  'Sesame-Free Recommended',
  'Shellfish-Free Recommended',
  'Fish-Free Recommended',
  'Soy-Free Recommended',
  'Legume-Free Recommended',
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Allergy-Friendly',
  'Halal',
  'Kosher',
  'Contains Gluten',
  'Contains Dairy',
  'Contains Egg',
  'Contains Nuts',
  'Contains Sesame',
  'Contains Soy',
  'Contains Fish',
  'Contains Shellfish',
  'May Contain Gluten',
  'May Contain Dairy',
  'May Contain Egg',
  'May Contain Nuts',
  'May Contain Sesame',
  'May Contain Soy',
  'May Contain Fish',
  'May Contain Shellfish',
];

// Sort options
const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'rating', label: 'Rating (High-Low)' },
];

const RestaurantSearchBar = ({ onFilterChange, initialFilters = {}, dietaryOptions = [] }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [search, setSearch] = useState(initialFilters.search || '');
  const [cuisine, setCuisine] = useState(initialFilters.cuisine || 'all');
  const [dietary, setDietary] = useState(initialFilters.dietary || []);
  const [sort, setSort] = useState(initialFilters.sort || 'name');
  const [searchDebounce, setSearchDebounce] = useState(null);

  const dietaryTagOptions = Array.from(
    new Set([
      ...DEFAULT_DIETARY_TAG_LABELS,
      ...dietaryOptions,
      ...dietary,
    ])
  )
    .filter(Boolean)
    .map((label) => ({ value: label, label }));

  // Debounce search input (300ms)
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      handleFilterChange();
    }, 300);

    setSearchDebounce(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, cuisine, dietary, sort]);

  const handleFilterChange = () => {
    onFilterChange({
      search,
      cuisine,
      dietary,
      sort,
      page: 1, // Reset to page 1 when filters change
    });
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Stack spacing={2}>
        {/* Search Input */}
        <TextField
          fullWidth
          placeholder="Search restaurants by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          size={isMobile ? 'small' : 'medium'}
        />

        {/* Filters Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="stretch"
        >
          {/* Cuisine Filter */}
          <FormControl sx={{ flex: 1, minWidth: 150 }} size={isMobile ? 'small' : 'medium'}>
            <InputLabel id="cuisine-select-label">Cuisine</InputLabel>
            <Select
              labelId="cuisine-select-label"
              value={cuisine}
              label="Cuisine"
              onChange={(e) => setCuisine(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <RestaurantIcon fontSize="small" color="action" />
                </InputAdornment>
              }
            >
              {CUISINE_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Dietary Tags Filter */}
          <FormControl sx={{ flex: 2, minWidth: 200 }} size={isMobile ? 'small' : 'medium'}>
            <InputLabel id="dietary-select-label">Dietary Options</InputLabel>
            <Select
              labelId="dietary-select-label"
              multiple
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              input={<OutlinedInput label="Dietary Options" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const tag = dietaryTagOptions.find((t) => t.value === value);
                    return (
                      <Chip
                        key={value}
                        label={tag ? tag.label : value}
                        size="small"
                        icon={getTagChipIcon(tag ? tag.label : value)}
                        variant="filled"
                        sx={getTagChipSx(tag ? tag.label : value)}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {dietaryTagOptions.map((tag) => {
                const tone = getTagTone(tag.label);
                const categoryLabel = getTagCategoryLabel(tag.label);

                return (
                  <MenuItem key={tag.value} value={tag.value}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '999px',
                            backgroundColor: tone.accent,
                            boxShadow: `0 0 0 3px ${tone.ring}`,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ whiteSpace: 'normal' }}>
                          {tag.label}
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: tone.text,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        {categoryLabel}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Sort Filter */}
          <FormControl sx={{ flex: 1, minWidth: 150 }} size={isMobile ? 'small' : 'medium'}>
            <InputLabel id="sort-select-label">Sort By</InputLabel>
            <Select
              labelId="sort-select-label"
              value={sort}
              label="Sort By"
              onChange={(e) => setSort(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon fontSize="small" color="action" />
                </InputAdornment>
              }
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Active Filters Display */}
        {(search || cuisine !== 'all' || dietary.length > 0) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
            {search && (
              <Chip
                label={`Search: "${search}"`}
                onDelete={() => setSearch('')}
                size="small"
                color="primary"
              />
            )}
            {cuisine !== 'all' && (
              <Chip
                label={`Cuisine: ${cuisine}`}
                onDelete={() => setCuisine('all')}
                size="small"
                color="secondary"
              />
            )}
            {dietary.map((tag) => {
              const tagObj = dietaryTagOptions.find((t) => t.value === tag);
              return (
                <Chip
                  key={tag}
                  label={tagObj ? tagObj.label : tag}
                  onDelete={() => setDietary(dietary.filter((t) => t !== tag))}
                  size="small"
                  icon={getTagChipIcon(tagObj ? tagObj.label : tag)}
                  variant="filled"
                  sx={getTagChipSx(tagObj ? tagObj.label : tag)}
                />
              );
            })}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default RestaurantSearchBar;
