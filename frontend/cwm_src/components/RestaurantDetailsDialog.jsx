import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Stack,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  useMediaQuery,
  useTheme,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatIcon from '@mui/icons-material/Chat';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import InfoIcon from '@mui/icons-material/Info';
import ReviewsIcon from '@mui/icons-material/Reviews';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import DirectionsIcon from '@mui/icons-material/Directions';
import LanguageIcon from '@mui/icons-material/Language';
import dataService from '../services/dataService';
import TrustScoreBadge from './TrustScoreBadge';

// Parse JSON strings safely
const parseJson = (jsonString) => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
};

// Format dietary tag for display
const formatDietaryTag = (tag) => {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getPriceDisplay = (priceRange) => {
  if (!priceRange || priceRange < 1) return null;
  return '$'.repeat(Math.min(priceRange, 4));
};

// Compute menu confidence status for UX
const computeMenuConfidence = (details) => {
  const menus = details?.menus || [];

  // No menus = not verified
  if (menus.length === 0) {
    return {
      status: 'not-verified',
      label: 'Menu not yet verified',
      icon: '🔴',
      color: 'error',
      description: 'This restaurant needs menu information before we can answer allergy questions.'
    };
  }

  // Check if menus are structured (V2) and count needs_review items
  let hasStructuredMenu = false;
  let totalItems = 0;
  let needsReviewCount = 0;

  for (const menu of menus) {
    const md = menu?.menu_data;

    // Check if it's V2 structured format
    if (md && typeof md === 'object' && md.version && Array.isArray(md.categories)) {
      hasStructuredMenu = true;

      for (const cat of md.categories) {
        const items = Array.isArray(cat?.items) ? cat.items : [];
        totalItems += items.length;
        for (const item of items) {
          if (item?.needs_review) needsReviewCount++;
        }
      }
    }
  }

  // Reviewed for allergens (structured + low needs review)
  if (hasStructuredMenu && totalItems > 0 && needsReviewCount === 0) {
    return {
      status: 'reviewed',
      label: 'Menu reviewed for allergens',
      icon: '🟢',
      color: 'success',
      description: `${totalItems} menu items ready to answer allergy and dietary questions.`
    };
  }

  // In progress (structured but has needs_review items)
  if (hasStructuredMenu && needsReviewCount > 0) {
    return {
      status: 'in-progress',
      label: 'Menu uploaded, review in progress',
      icon: '🟡',
      color: 'warning',
      description: `${totalItems - needsReviewCount} of ${totalItems} items verified. Some items still need ingredient review.`
    };
  }

  // Legacy format (has menu but not structured)
  if (menus.length > 0 && !hasStructuredMenu) {
    return {
      status: 'legacy',
      label: 'Menu available, allergen data pending',
      icon: '🟡',
      color: 'warning',
      description: 'Menu is uploaded but needs formatting for allergy safety features.'
    };
  }

  return {
    status: 'not-verified',
    label: 'Menu not yet verified',
    icon: '🔴',
    color: 'error',
    description: 'Menu information is incomplete.'
  };
};


// Tab Panel Component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`restaurant-tabpanel-${index}`}
      aria-labelledby={`restaurant-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const RestaurantDetailsDialog = ({ open, onClose, restaurantId, onStartChat }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [googleData, setGoogleData] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    console.log('[RestaurantDialog] open', open, 'id', restaurantId);

    // Allow id=0 (Il Violino)
    if (!open) return;
    if (restaurantId == null) return;

    fetchDetails();
    fetchGoogleData();
    // Reset tab when dialog opens
    setTabValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restaurantId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getRestaurantDetails(restaurantId);
      console.log('[RestaurantDialog] detail keys', Object.keys(data || {}));
      console.log('[RestaurantDialog] full data', data);
      setDetails(data);
    } catch (err) {
      setError('Failed to load restaurant details. Please try again.');
      console.error('Error fetching restaurant details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleData = async () => {
    setGoogleLoading(true);
    try {
      // Call public cached endpoint (no auth, no Google API calls)
      const result = await dataService.getGoogleCachedData(restaurantId);
      console.log('[RestaurantDialog] Google cached data:', result);
      setGoogleData(result.google);
    } catch (err) {
      console.error('Failed to load Google cached data:', err);
      // Non-critical - continue without Google data
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleStartChat = () => {
    if (onStartChat && details) {
      onStartChat(details.restaurant);
    }
  };

  const dietaryTags = details?.restaurant?.dietary_display_tags?.length
    ? details.restaurant.dietary_display_tags
    : (parseJson(details?.restaurant?.dietary_tags) || []).map(formatDietaryTag);
  const hours = parseJson(details?.restaurant?.hours_json);
  const menuConfidence = details ? computeMenuConfidence(details) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestaurantMenuIcon color="primary" />
          <Typography variant="h6" component="span">
            {details?.restaurant?.name || 'Restaurant Details'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant={fullScreen ? 'fullWidth' : 'standard'}
        >
          <Tab icon={<InfoIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<RestaurantMenuIcon />} label="Menus" iconPosition="start" />
          <Tab icon={<ReviewsIcon />} label="Reviews" iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && details && (
          <>
            {/* Overview Tab - DINING COCKPIT DASHBOARD */}
            <TabPanel value={tabValue} index={0}>
              <Stack spacing={2.5}>
                {/* HERO: Restaurant Photo + Quick Stats */}
                <Card elevation={0} sx={{ position: 'relative', overflow: 'hidden', bgcolor: 'grey.100' }}>
                  {/* Real Google Photo (secure proxy - no API keys exposed) */}
                  {googleData?.photo_refs && googleData.photo_refs.length > 0 ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={`https://chatwithmenu.com/api/restaurant/${restaurantId}/photo/0`}
                      alt={details?.restaurant?.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}
                    >
                        <RestaurantMenuIcon sx={{ fontSize: 80, color: 'white', opacity: 0.3 }} />
                    </Box>
                  )}

                  {/* Overlay with restaurant name and quick stats */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      p: 2,
                      color: 'white'
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {details.restaurant?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {details.restaurant?.cuisine_type && (
                        <Chip label={details.restaurant.cuisine_type} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                      )}
                      {getPriceDisplay(details.restaurant?.price_range) && (
                        <Chip label={getPriceDisplay(details.restaurant?.price_range)} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                      )}
                      {googleData?.rating && (
                        <Chip
                          icon={<span style={{ color: 'gold' }}>⭐</span>}
                          label={`${googleData.rating} (${googleData.user_ratings_total || 0})`}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        />
                      )}
                    </Box>
                  </Box>
                </Card>

                {/* Trust Score Badge */}
                <TrustScoreBadge restaurantId={restaurantId} />

                {/* PRIMARY ACTION: Start Chat (Hero Button) */}
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ChatIcon />}
                  onClick={handleStartChat}
                  fullWidth
                  sx={{
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)',
                    }
                  }}
                >
                  Ask About Allergies & Ingredients
                </Button>

                {/* Quick Actions Row */}
                <Grid container spacing={1}>
                  {(googleData?.phone || details.restaurant?.phone) && (
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PhoneIcon />}
                        fullWidth
                        href={`tel:${googleData?.phone || details.restaurant.phone}`}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Call
                      </Button>
                    </Grid>
                  )}
                  {(googleData?.address || details.restaurant?.address) && (
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DirectionsIcon />}
                        fullWidth
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleData?.address || details.restaurant.address)}`}
                        target="_blank"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Directions
                      </Button>
                    </Grid>
                  )}
                  {(googleData?.website || details.restaurant?.website) && (
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LanguageIcon />}
                        fullWidth
                        href={googleData?.website || details.restaurant.website}
                        target="_blank"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Website
                      </Button>
                    </Grid>
                  )}
                </Grid>

                {/* TRUST & SAFETY CARD */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {menuConfidence?.icon} Allergy Safety Status
                    </Typography>

                    <Alert
                      severity={menuConfidence?.color || 'info'}
                      sx={{ mb: 2 }}
                      icon={false}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {menuConfidence?.label}
                      </Typography>
                      <Typography variant="caption">
                        {menuConfidence?.description}
                      </Typography>
                    </Alert>

                    {/* Combined Trust Indicator */}
                    {googleData?.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Google Rating
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Rating value={googleData.rating} precision={0.1} readOnly size="small" />
                            <Typography variant="body2" fontWeight={600}>
                              {googleData.rating.toFixed(1)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({googleData.user_ratings_total} Google reviews)
                            </Typography>
                          </Box>
                        </Box>
                        {menuConfidence?.status === 'reviewed' && (
                          <Chip
                            icon={<CheckCircleIcon />}
                            label="Verified Safe"
                            color="success"
                            size="small"
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* QUICK INFO CARDS */}
                <Grid container spacing={2}>
                  {/* Hours Card */}
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <AccessTimeIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Hours
                        </Typography>
                      </Box>
                      {hours && Object.keys(hours).length > 0 ? (
                        <Box>
                          <Chip
                            label="Closed Now"
                            size="small"
                            color="error"
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="caption" display="block" color="text.secondary">
                            Today: {hours[Object.keys(hours)[0]]}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Hours not available
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  {/* Dietary Options Card */}
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocalDiningIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Dietary Options
                        </Typography>
                      </Box>
                      {dietaryTags && dietaryTags.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {dietaryTags.slice(0, 5).map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="outlined"
                              color="success"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Ask in chat for details
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  {/* Contact Card */}
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <LocationOnIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Location & Contact
                        </Typography>
                      </Box>
                      <Stack spacing={1}>
                        {(googleData?.address || details.restaurant?.address) && (
                          <Typography variant="body2">
                            📍 {googleData?.address || details.restaurant.address}
                          </Typography>
                        )}
                        {(googleData?.phone || details.restaurant?.phone) && (
                          <Typography variant="body2">
                            📞 {googleData?.phone || details.restaurant.phone}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>

                {/* WHAT YOU CAN ASK */}
                <Card variant="outlined" sx={{ bgcolor: 'primary.50', borderColor: 'primary.200' }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ color: 'primary.main' }}>
                      💡 What You Can Ask
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        • "What dishes are safe for peanut allergy?"
                      </Typography>
                      <Typography variant="body2">
                        • "Is the pasta gluten-free?"
                      </Typography>
                      <Typography variant="body2">
                        • "What are the vegetarian options?"
                      </Typography>
                      <Typography variant="body2">
                        • "Does the sauce contain dairy?"
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Description (minimal) */}
                {details.restaurant?.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {details.restaurant.description}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </TabPanel>

            {/* Menus Tab */}
            <TabPanel value={tabValue} index={1}>
              {details.menus && details.menus.length > 0 ? (
                <Stack spacing={2}>
                  {details.menus.map((menu, index) => (
                    <Accordion key={menu.id} defaultExpanded={index === 0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">
                          Menu {details.menus.length > 1 ? `${index + 1}` : ''}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {menu.menu_data && menu.menu_data.menus && menu.menu_data.menus.length > 0 ? (
                          menu.menu_data.menus.map((section) => (
                            <Box key={section.id} sx={{ mb: 3 }}>
                              <Typography variant="h6" gutterBottom>
                                {section.name}
                              </Typography>
                              {section.categories && section.categories.map((category) => (
                                <Box key={category.id} sx={{ mb: 2 }}>
                                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                    {category.name}
                                  </Typography>
                                  <List dense>
                                    {category.items && category.items.map((item) => (
                                      <ListItem key={item.id} sx={{ px: 0 }}>
                                        <ListItemText
                                          primary={
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Typography variant="body1">{item.name}</Typography>
                                              {item.price && (
                                                <Typography variant="body1" fontWeight={600}>
                                                  ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
                                                </Typography>
                                              )}
                                            </Box>
                                          }
                                          secondary={item.description}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              ))}
                            </Box>
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Menu details not available
                          </Typography>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No menus available for this restaurant.</Alert>
              )}
            </TabPanel>

            {/* Reviews Tab */}
            <TabPanel value={tabValue} index={2}>
              {details.recent_reviews && details.recent_reviews.length > 0 ? (
                <Stack spacing={2}>
                  {details.recent_reviews.map((review, index) => (
                    <Box key={index} sx={{ pb: 2, borderBottom: index < details.recent_reviews.length - 1 ? 1 : 0, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {review.user_name}
                        </Typography>
                        <Rating value={review.rating} size="small" readOnly />
                      </Box>
                      {review.item && (
                        <Typography variant="body2" color="primary" gutterBottom>
                          Reviewed: {review.item}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {review.review_text}
                      </Typography>
                      {review.datetime && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                          {new Date(review.datetime).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No reviews yet. Be the first to review this restaurant!</Alert>
              )}
            </TabPanel>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<ChatIcon />}
          onClick={handleStartChat}
          disabled={!details}
        >
          Start Chat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RestaurantDetailsDialog;
