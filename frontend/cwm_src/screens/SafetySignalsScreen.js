import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';

import {
  Button,
  Typography,
  Paper,
  Container,
  Box,
  Stack,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Autocomplete,
  Grid,
  Alert,
  IconButton,
  Divider,
  Rating,
  Skeleton,
  InputAdornment,
} from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShieldIcon from '@mui/icons-material/Shield';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';

// Verification state options
const VERIFICATION_STATES = [
  { value: 'unverified', label: 'Unverified', color: 'default' },
  { value: 'restaurant_verified', label: 'Restaurant Verified', color: 'success' },
  { value: 'staff_verified', label: 'Staff Verified', color: 'info' },
  { value: 'kitchen_confirmed', label: 'Kitchen Confirmed', color: 'success' },
];

// Evidence type options
const EVIDENCE_TYPES = [
  { value: 'menu_label', label: 'Menu Label' },
  { value: 'server_confirmed', label: 'Server Confirmed' },
  { value: 'kitchen_confirmed', label: 'Kitchen Confirmed' },
  { value: 'user_experience', label: 'User Experience' },
];

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'table_only', label: 'Table Only' },
  { value: 'private', label: 'Private' },
];

// Common dietary restrictions
const COMMON_RESTRICTIONS = [
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Vegan',
  'Vegetarian',
  'Shellfish-Free',
  'Egg-Free',
  'Soy-Free',
  'Kosher',
  'Halal',
];

const SafetySignalsScreen = () => {
  const navigate = useNavigate();
  const { userId, isInitialized } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterRestaurant, setFilterRestaurant] = useState('all');
  const [filterRestriction, setFilterRestriction] = useState('all');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Create signal form state
  const [newSignal, setNewSignal] = useState({
    restaurant_id: null,
    dish_name: '',
    restrictions_met: [],
    what_worked: '',
    notes: '',
    verification_state: 'unverified',
    evidence_type: 'user_experience',
    confidence: 3,
    visibility: 'table_only',
    is_anonymous: false,
  });

  useEffect(() => {
    // Wait for UserContext to initialize from localStorage
    if (!isInitialized) {
      return;
    }

    if (userId === null || userId === undefined) {
      navigate('/login');
      return;
    }

    fetchData();
  }, [userId, isInitialized, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch safety signals (mock data for now - backend endpoint to be implemented)
      // In production, this would call: await dataService.getSafetySignals()
      const mockSignals = [
        {
          id: 1,
          restaurant_id: 0,
          restaurant_name: 'Il Violino',
          dish_name: 'Gluten-Free Pasta',
          restrictions_met: ['Gluten-Free', 'Dairy-Free'],
          what_worked: 'The kitchen prepared a dedicated gluten-free pasta with olive oil and vegetables. No cross-contamination observed.',
          notes: 'Staff was very knowledgeable about allergen protocols.',
          verification_state: 'kitchen_confirmed',
          evidence_type: 'kitchen_confirmed',
          confidence: 5,
          visibility: 'table_only',
          is_anonymous: false,
          user_name: 'John Doe',
          created_at: '2026-01-22T18:30:00Z',
        },
        {
          id: 2,
          restaurant_id: 0,
          restaurant_name: 'Il Violino',
          dish_name: 'Vegan Risotto',
          restrictions_met: ['Vegan', 'Dairy-Free'],
          what_worked: 'Made with vegetable stock and no butter. Chef personally confirmed ingredients.',
          notes: '',
          verification_state: 'staff_verified',
          evidence_type: 'server_confirmed',
          confidence: 4,
          visibility: 'table_only',
          is_anonymous: true,
          user_name: null,
          created_at: '2026-01-21T12:15:00Z',
        },
      ];

      // Fetch restaurants for dropdown
      const restaurantList = await dataService.listRestaurants();
      setRestaurants(restaurantList || []);
      setSignals(mockSignals);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load safety signals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSignal = async () => {
    // Validate required fields
    if (!newSignal.restaurant_id) {
      setError('Please select a restaurant');
      return;
    }
    if (!newSignal.dish_name.trim()) {
      setError('Please enter a dish name');
      return;
    }
    if (newSignal.restrictions_met.length === 0) {
      setError('Please select at least one restriction');
      return;
    }
    if (!newSignal.what_worked.trim()) {
      setError('Please describe what worked');
      return;
    }

    try {
      // In production, this would call: await dataService.createSafetySignal(userId, newSignal)
      console.log('Creating safety signal:', newSignal);

      setSuccess('Safety signal created successfully!');
      setCreateDialogOpen(false);
      resetNewSignal();

      // Refresh signals
      setTimeout(() => {
        fetchData();
        setSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Error creating signal:', err);
      setError('Failed to create safety signal. Please try again.');
    }
  };

  const resetNewSignal = () => {
    setNewSignal({
      restaurant_id: null,
      dish_name: '',
      restrictions_met: [],
      what_worked: '',
      notes: '',
      verification_state: 'unverified',
      evidence_type: 'user_experience',
      confidence: 3,
      visibility: 'table_only',
      is_anonymous: false,
    });
  };

  const getVerificationBadge = (state) => {
    const stateConfig = VERIFICATION_STATES.find((s) => s.value === state) || VERIFICATION_STATES[0];
    return (
      <Chip
        label={stateConfig.label}
        color={stateConfig.color}
        size="small"
        icon={state === 'kitchen_confirmed' || state === 'restaurant_verified' ? <CheckCircleIcon /> : <InfoIcon />}
      />
    );
  };

  const getEvidenceTypeLabel = (type) => {
    const evidence = EVIDENCE_TYPES.find((e) => e.value === type);
    return evidence ? evidence.label : type;
  };

  const filteredSignals = signals.filter((signal) => {
    if (filterRestaurant !== 'all' && signal.restaurant_id !== parseInt(filterRestaurant)) {
      return false;
    }
    if (filterRestriction !== 'all' && !signal.restrictions_met.includes(filterRestriction)) {
      return false;
    }
    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} color="primary">
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                Safety Signals
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ fontWeight: 600 }}
          >
            Create Signal
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Share and discover verified allergy-safe dishes
        </Typography>
      </Box>

      {/* Error/Success Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Info Card */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <VerifiedUserIcon sx={{ fontSize: 40, opacity: 0.9 }} />
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                How Safety Signals Work
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.95 }}>
                Safety signals are community-verified reports of allergy-safe dishes. Share your positive experiences
                to help others dine safely. Signals include verification levels, confidence ratings, and evidence types
                to help you make informed decisions.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <FilterListIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Filters
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Restaurant</InputLabel>
              <Select
                value={filterRestaurant}
                label="Restaurant"
                onChange={(e) => setFilterRestaurant(e.target.value)}
              >
                <MenuItem value="all">All Restaurants</MenuItem>
                {restaurants.map((restaurant) => (
                  <MenuItem key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Restriction Type</InputLabel>
              <Select
                value={filterRestriction}
                label="Restriction Type"
                onChange={(e) => setFilterRestriction(e.target.value)}
              >
                <MenuItem value="all">All Restrictions</MenuItem>
                {COMMON_RESTRICTIONS.map((restriction) => (
                  <MenuItem key={restriction} value={restriction}>
                    {restriction}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Safety Signals List */}
      {loading ? (
        <Stack spacing={3}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={200} />
          ))}
        </Stack>
      ) : filteredSignals.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShieldIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No safety signals found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {filterRestaurant !== 'all' || filterRestriction !== 'all'
              ? 'Try adjusting your filters'
              : 'Be the first to create a safety signal'}
          </Typography>
          {filterRestaurant === 'all' && filterRestriction === 'all' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
              Create Safety Signal
            </Button>
          )}
        </Box>
      ) : (
        <Stack spacing={3}>
          {filteredSignals.map((signal) => (
            <Card key={signal.id} variant="outlined" sx={{ transition: 'all 0.3s', '&:hover': { boxShadow: 3 } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <RestaurantIcon color="primary" fontSize="small" />
                      <Typography variant="h6" fontWeight={600}>
                        {signal.restaurant_name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <RestaurantMenuIcon fontSize="small" color="action" />
                      <Typography variant="body1" fontWeight={500}>
                        {signal.dish_name}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    {getVerificationBadge(signal.verification_state)}
                    <Rating value={signal.confidence} readOnly size="small" />
                  </Box>
                </Box>

                {/* Restrictions Met */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Restrictions Met
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {signal.restrictions_met.map((restriction) => (
                      <Chip
                        key={restriction}
                        label={restriction}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>

                {/* What Worked */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    What Worked
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'success.50' }}>
                    <Typography variant="body2">{signal.what_worked}</Typography>
                  </Paper>
                </Box>

                {/* Notes */}
                {signal.notes && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      Additional Notes
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {signal.notes}
                    </Typography>
                  </Box>
                )}

                {/* Footer */}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Chip
                      label={getEvidenceTypeLabel(signal.evidence_type)}
                      size="small"
                      variant="outlined"
                      icon={<InfoIcon />}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {signal.is_anonymous ? (
                        <>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            Anonymous
                          </Typography>
                        </>
                      ) : (
                        <>
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {signal.user_name}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(signal.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Create Signal Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => {
          setCreateDialogOpen(false);
          resetNewSignal();
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Create Safety Signal
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setCreateDialogOpen(false);
              resetNewSignal();
              setError(null);
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Restaurant Selector */}
            <Autocomplete
              options={restaurants}
              getOptionLabel={(option) => option.name || ''}
              value={restaurants.find((r) => r.id === newSignal.restaurant_id) || null}
              onChange={(e, value) => setNewSignal({ ...newSignal, restaurant_id: value?.id || null })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Restaurant"
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <RestaurantIcon color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* Dish Name */}
            <TextField
              fullWidth
              label="Dish Name"
              value={newSignal.dish_name}
              onChange={(e) => setNewSignal({ ...newSignal, dish_name: e.target.value })}
              required
              placeholder="e.g., Gluten-Free Pasta"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RestaurantMenuIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Restrictions Met */}
            <Autocomplete
              multiple
              options={COMMON_RESTRICTIONS}
              value={newSignal.restrictions_met}
              onChange={(e, value) => setNewSignal({ ...newSignal, restrictions_met: value })}
              renderInput={(params) => (
                <TextField {...params} label="Restrictions Met" required placeholder="Select restrictions" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    color="success"
                    size="small"
                  />
                ))
              }
            />

            {/* What Worked */}
            <TextField
              fullWidth
              label="What Worked"
              value={newSignal.what_worked}
              onChange={(e) => setNewSignal({ ...newSignal, what_worked: e.target.value })}
              required
              multiline
              rows={3}
              placeholder="Describe how the restaurant accommodated your dietary needs..."
            />

            {/* Notes (Optional) */}
            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              value={newSignal.notes}
              onChange={(e) => setNewSignal({ ...newSignal, notes: e.target.value })}
              multiline
              rows={2}
              placeholder="Any additional information..."
            />

            {/* Verification State */}
            <FormControl fullWidth>
              <InputLabel>Verification State</InputLabel>
              <Select
                value={newSignal.verification_state}
                label="Verification State"
                onChange={(e) => setNewSignal({ ...newSignal, verification_state: e.target.value })}
              >
                {VERIFICATION_STATES.map((state) => (
                  <MenuItem key={state.value} value={state.value}>
                    {state.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Evidence Type */}
            <FormControl fullWidth>
              <InputLabel>Evidence Type</InputLabel>
              <Select
                value={newSignal.evidence_type}
                label="Evidence Type"
                onChange={(e) => setNewSignal({ ...newSignal, evidence_type: e.target.value })}
              >
                {EVIDENCE_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Confidence Slider */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Confidence Level
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Slider
                  value={newSignal.confidence}
                  onChange={(e, value) => setNewSignal({ ...newSignal, confidence: value })}
                  min={1}
                  max={5}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  sx={{ flex: 1 }}
                />
                <Rating value={newSignal.confidence} readOnly size="small" />
              </Box>
            </Box>

            {/* Visibility */}
            <FormControl fullWidth>
              <InputLabel>Visibility</InputLabel>
              <Select
                value={newSignal.visibility}
                label="Visibility"
                onChange={(e) => setNewSignal({ ...newSignal, visibility: e.target.value })}
                startAdornment={
                  <InputAdornment position="start">
                    <VisibilityIcon color="action" />
                  </InputAdornment>
                }
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Attribution Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={newSignal.is_anonymous}
                  onChange={(e) => setNewSignal({ ...newSignal, is_anonymous: e.target.checked })}
                />
              }
              label="Post anonymously"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetNewSignal();
              setError(null);
            }}
            color="inherit"
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateSignal} startIcon={<AddIcon />}>
            Create Signal
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SafetySignalsScreen;
