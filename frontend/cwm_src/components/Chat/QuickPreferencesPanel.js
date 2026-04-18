import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  FormGroup,
  FormControlLabel,
  Switch,
  Slider,
  Divider,
  Button,
  Chip,
  Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TuneIcon from '@mui/icons-material/Tune';

/**
 * QuickPreferencesPanel - Overlay panel for temporary dietary adjustments
 *
 * Allows users to toggle allergies and adjust taste preferences
 * without permanently changing their profile. Changes are session-only.
 */
function QuickPreferencesPanel({ open, onClose, currentPrefs, onChange }) {
  const [tempPrefs, setTempPrefs] = useState(currentPrefs || {
    allergies: {
      gluten: false,
      dairy: false,
      eggs: false,
      fish: false,
      peanuts: false,
      shellfish: false,
      soy: false,
      tree_nuts: false
    },
    taste: {
      spicy: 5,
      salty: 5,
      sweet: 5,
      sour: 5,
      bitter: 5,
      savory: 5
    }
  });

  useEffect(() => {
    if (currentPrefs) {
      setTempPrefs(currentPrefs);
    }
  }, [currentPrefs]);

  const handleAllergyToggle = (allergen) => {
    setTempPrefs(prev => ({
      ...prev,
      allergies: {
        ...prev.allergies,
        [allergen]: !prev.allergies[allergen]
      }
    }));
  };

  const handleTasteChange = (taste, value) => {
    setTempPrefs(prev => ({
      ...prev,
      taste: {
        ...prev.taste,
        [taste]: value
      }
    }));
  };

  const handleApply = () => {
    if (onChange) {
      onChange(tempPrefs);
    }
    onClose();
  };

  const handleReset = () => {
    setTempPrefs({
      allergies: Object.keys(tempPrefs.allergies).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {}),
      taste: {
        spicy: 5,
        salty: 5,
        sweet: 5,
        sour: 5,
        bitter: 5,
        savory: 5
      }
    });
  };

  const allergenLabels = {
    gluten: 'Gluten',
    dairy: 'Dairy',
    eggs: 'Eggs',
    fish: 'Fish',
    peanuts: 'Peanuts',
    shellfish: 'Shellfish',
    soy: 'Soy',
    tree_nuts: 'Tree Nuts'
  };

  const tasteLabels = {
    spicy: '🌶️ Spicy',
    salty: '🧂 Salty',
    sweet: '🍬 Sweet',
    sour: '🍋 Sour',
    bitter: '☕ Bitter',
    savory: '🍖 Savory'
  };

  const activeAllergiesCount = Object.values(tempPrefs.allergies).filter(Boolean).length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon color="primary" />
          <Typography variant="h6">Quick Adjustments</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Temporary changes for this chat session only
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Allergen Alerts
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Toggle off to temporarily allow certain allergens
        </Typography>

        {activeAllergiesCount > 0 && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(tempPrefs.allergies)
                .filter(([_, value]) => value)
                .map(([allergen]) => (
                  <Chip
                    key={allergen}
                    label={allergenLabels[allergen]}
                    color="error"
                    size="small"
                    onDelete={() => handleAllergyToggle(allergen)}
                  />
                ))}
            </Stack>
          </Box>
        )}

        <FormGroup>
          {Object.keys(allergenLabels).map(allergen => (
            <FormControlLabel
              key={allergen}
              control={
                <Switch
                  checked={tempPrefs.allergies[allergen]}
                  onChange={() => handleAllergyToggle(allergen)}
                  color="error"
                />
              }
              label={allergenLabels[allergen]}
            />
          ))}
        </FormGroup>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Taste Preferences
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Adjust your taste preferences (0 = avoid, 10 = love it)
        </Typography>

        {Object.keys(tasteLabels).map(taste => (
          <Box key={taste} sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              {tasteLabels[taste]}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={tempPrefs.taste[taste]}
                onChange={(e, val) => handleTasteChange(taste, val)}
                min={0}
                max={10}
                step={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
                valueLabelDisplay="auto"
                sx={{ flex: 1 }}
              />
              <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center' }}>
                {tempPrefs.taste[taste]}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          fullWidth
        >
          Reset
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          fullWidth
        >
          Apply Changes
        </Button>
      </Box>
    </Drawer>
  );
}

export default QuickPreferencesPanel;
