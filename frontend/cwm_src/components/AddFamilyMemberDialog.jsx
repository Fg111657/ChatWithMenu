import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Autocomplete,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import { COMMON_ALLERGENS } from '../utils/allergens';

const SEVERITY_LEVELS = ['High', 'Medium', 'Low'];
const RESTRICTION_TYPES = ['Allergy', 'Preference'];
const RELATIONSHIPS = [
  { value: 'child', label: 'Child' },
  { value: 'teen', label: 'Teen (13-17)' },
  { value: 'adult_dependent', label: 'Adult Dependent' },
];

const AddFamilyMemberDialog = ({ open, onClose, onSave, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    age: initialData?.age || '',
    relationship: initialData?.relationship || 'child',
    emergency_contact: initialData?.emergency_contact || '',
  });

  const [allergies, setAllergies] = useState(initialData?.allergies || []);
  const [newAllergy, setNewAllergy] = useState({
    ingredient: '',
    restriction_type: 'Allergy',
    severity: 'High',
    notes: '',
  });
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAllergy = () => {
    if (!newAllergy.ingredient.trim()) {
      setError('Please enter an allergen');
      return;
    }

    // Check for duplicates
    if (allergies.some((a) => a.ingredient.toLowerCase() === newAllergy.ingredient.toLowerCase())) {
      setError('This allergen has already been added');
      return;
    }

    setAllergies([...allergies, { ...newAllergy }]);
    setNewAllergy({
      ingredient: '',
      restriction_type: 'Allergy',
      severity: 'High',
      notes: '',
    });
    setError('');
  };

  const handleRemoveAllergy = (index) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError('Please enter a name');
      return;
    }

    if (formData.age && (isNaN(formData.age) || formData.age < 0 || formData.age > 120)) {
      setError('Please enter a valid age');
      return;
    }

    onSave({
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
      allergies,
    });

    // Reset form
    setFormData({
      name: '',
      age: '',
      relationship: 'child',
      emergency_contact: '',
    });
    setAllergies([]);
    setError('');
  };

  const handleClose = () => {
    setFormData({
      name: '',
      age: '',
      relationship: 'child',
      emergency_contact: '',
    });
    setAllergies([]);
    setNewAllergy({
      ingredient: '',
      restriction_type: 'Allergy',
      severity: 'High',
      notes: '',
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChildCareIcon color="primary" />
          <Typography variant="h6">
            {initialData ? 'Edit Family Member' : 'Add Family Member'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {/* Basic Info */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                fullWidth
                required
                autoFocus
                placeholder="e.g., Emma"
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  sx={{ flex: 1 }}
                  placeholder="e.g., 8"
                />

                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>Relationship</InputLabel>
                  <Select
                    value={formData.relationship}
                    label="Relationship"
                    onChange={(e) => handleInputChange('relationship', e.target.value)}
                  >
                    {RELATIONSHIPS.map((rel) => (
                      <MenuItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Emergency Contact"
                value={formData.emergency_contact}
                onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                fullWidth
                placeholder="e.g., Grandma Mary: (555) 123-4567"
                helperText="Optional: Name and phone number"
              />
            </Stack>
          </Box>

          <Divider />

          {/* Allergies & Restrictions */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Allergies & Dietary Restrictions
            </Typography>

            {/* Added Allergies */}
            {allergies.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {allergies.map((allergy, index) => (
                    <Chip
                      key={index}
                      label={allergy.ingredient}
                      onDelete={() => handleRemoveAllergy(index)}
                      color={
                        allergy.severity === 'High'
                          ? 'error'
                          : allergy.severity === 'Medium'
                          ? 'warning'
                          : 'info'
                      }
                      sx={{ fontWeight: allergy.severity === 'High' ? 600 : 400 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Add Allergy Form */}
            <Stack spacing={1.5}>
              <Autocomplete
                freeSolo
                options={COMMON_ALLERGENS}
                value={newAllergy.ingredient}
                onChange={(e, value) =>
                  setNewAllergy({ ...newAllergy, ingredient: value || '' })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Allergen / Food" placeholder="e.g., Peanuts" />
                )}
              />

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newAllergy.restriction_type}
                    label="Type"
                    onChange={(e) =>
                      setNewAllergy({ ...newAllergy, restriction_type: e.target.value })
                    }
                  >
                    {RESTRICTION_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={newAllergy.severity}
                    label="Severity"
                    onChange={(e) => setNewAllergy({ ...newAllergy, severity: e.target.value })}
                  >
                    {SEVERITY_LEVELS.map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddAllergy}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Add
                </Button>
              </Box>

              <TextField
                label="Notes (Optional)"
                value={newAllergy.notes}
                onChange={(e) => setNewAllergy({ ...newAllergy, notes: e.target.value })}
                multiline
                rows={2}
                placeholder="e.g., Severe reaction, always carry EpiPen"
                size="small"
              />
            </Stack>

            {allergies.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Add any allergies or dietary restrictions for this family member. You can add
                multiple items.
              </Alert>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={!formData.name.trim()}>
          {initialData ? 'Save Changes' : 'Add Family Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFamilyMemberDialog;
