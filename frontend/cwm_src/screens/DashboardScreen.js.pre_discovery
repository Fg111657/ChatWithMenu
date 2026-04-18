import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import { UserContext } from '../UserContext';
import RestaurantSearchBar from '../components/RestaurantSearchBar';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantDetailsDialog from '../components/RestaurantDetailsDialog';

import {
  Button,
  Typography,
  Paper,
  Grid,
  Container,
  Box,
  Stack,
  Divider,
  Skeleton,
  Chip,
  Alert,
  Pagination,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import TuneIcon from '@mui/icons-material/Tune';
import StorefrontIcon from '@mui/icons-material/Storefront';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import GroupsIcon from '@mui/icons-material/Groups';

// Role constants
const ROLE_ADMIN = 1;
const ROLE_MERCHANT = 2;
const ROLE_SERVER = 3;

const getRoleInfo = (accountType) => {
  switch (accountType) {
    case ROLE_ADMIN:
      return { label: 'Admin', color: 'error', icon: <PersonIcon /> };
    case ROLE_MERCHANT:
      return { label: 'Restaurant Owner', color: 'secondary', icon: <StorefrontIcon /> };
    case ROLE_SERVER:
      return { label: 'Server', color: 'info', icon: <RoomServiceIcon /> };
    default:
      return { label: 'Diner', color: 'primary', icon: <RestaurantIcon /> };
  }
};

const canUserEditRestaurants = (userData) => {
  return userData?.account_type === ROLE_ADMIN || userData?.account_type === ROLE_MERCHANT;
};

const isServer = (userData) => {
  return userData?.account_type === ROLE_SERVER;
};

const DashboardScreen = () => {
  console.log('🔍 DASHBOARD BUILD: 2026-01-18-05:28 with null safety fix');
  const navigate = useNavigate();
  const { userId, isInitialized } = useContext(UserContext);
  const [userData, setUserData] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [totalRestaurants, setTotalRestaurants] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState({
    search: '',
    cuisine: 'all',
    dietary: [],
    sort: 'name',
    page: 1,
    per_page: 20,
  });
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    // Wait for UserContext to initialize from localStorage
    if (!isInitialized) {
      return;
    }

    if (userId === null || userId === undefined) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const userDataResult = await dataService.loadUserData(userId);
        setUserData(userDataResult);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, isInitialized, navigate]);

  // Fetch restaurants when filters change
  useEffect(() => {
    if (userData) {
      fetchRestaurants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters, userData]);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const result = await dataService.searchRestaurants(searchFilters);
      setRestaurants(result.restaurants || []);
      setTotalRestaurants(result.total || 0);
      setTotalPages(result.total_pages || 0);
    } catch (error) {
      console.log(error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setSearchFilters(newFilters);
  };

  const handlePageChange = (event, page) => {
    setSearchFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestaurantCardClick = (restaurant) => {
    if (isServer(userData)) {
      // Servers go directly to server dashboard
      navigate('/server-dashboard', { state: { restaurantId: restaurant.id, restaurantName: restaurant.name } });
    } else {
      // Diners see details dialog
      setSelectedRestaurant(restaurant);
      setDetailsDialogOpen(true);
    }
  };

  const handleStartChat = (restaurant) => {
    setDetailsDialogOpen(false);
    navigate('/chat', { state: { restaurantId: restaurant.id, restaurantName: restaurant.name } });
  };

  const handleRestaurantDelete = async (restaurantId) => {
    try {
      await dataService.deleteRestaurant(userId, restaurantId);
      // Refresh the list after deletion
      fetchRestaurants();
    } catch (error) {
      console.log(error);
    }
  };

  const roleInfo = getRoleInfo(userData?.account_type);

  // Role-specific settings buttons
  const getDinerButtons = () => [
    { label: 'Edit Profile', icon: <PersonIcon />, onClick: () => navigate('/edit-profile', { state: { userId } }) },
    { label: 'My Allergies', icon: <WarningIcon />, onClick: () => navigate('/modify-preferences', { state: { restrictionType: 'allergy' } }), color: 'error' },
    { label: 'My Preferences', icon: <TuneIcon />, onClick: () => navigate('/modify-preferences', { state: { restrictionType: 'preference' } }) },
    { label: 'Manage Family', icon: <FamilyRestroomIcon />, onClick: () => navigate('/family-management'), color: 'secondary' },
    { label: 'My Table', icon: <GroupsIcon />, onClick: () => navigate('/my-table'), color: 'primary', description: 'Connect with trusted diners' },
  ];

  const getMerchantButtons = () => [
    { label: 'Add Restaurant', icon: <AddIcon />, onClick: () => navigate('/add-restaurant'), color: 'secondary' },
    { label: 'Manage Menus', icon: <MenuBookIcon />, onClick: () => navigate('/menu-manager'), color: 'primary' },
    { label: 'Edit Profile', icon: <PersonIcon />, onClick: () => navigate('/edit-profile', { state: { userId } }) },
  ];

  const getServerButtons = () => [
    { label: 'Quick Allergy Check', icon: <WarningIcon />, onClick: () => {}, color: 'error' },
    { label: 'View Specials', icon: <RoomServiceIcon />, onClick: () => {}, color: 'secondary' },
    { label: 'Edit Profile', icon: <PersonIcon />, onClick: () => navigate('/edit-profile', { state: { userId } }) },
  ];

  const getSettingsButtons = () => {
    if (!userData) return [];

    switch (userData.account_type) {
      case ROLE_MERCHANT:
      case ROLE_ADMIN:
        return getMerchantButtons();
      case ROLE_SERVER:
        return getServerButtons();
      default:
        return getDinerButtons();
    }
  };

  const getRoleWelcomeMessage = () => {
    switch (userData?.account_type) {
      case ROLE_MERCHANT:
      case ROLE_ADMIN:
        return 'Manage your restaurants and menus';
      case ROLE_SERVER:
        return 'Select a restaurant to assist guests';
      default:
        return 'Select a restaurant to start chatting about their menu';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Role Badge */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {!loading && (
            <Chip
              icon={roleInfo.icon}
              label={roleInfo.label}
              color={roleInfo.color}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          {loading ? <Skeleton width={250} sx={{ mx: 'auto' }} /> : `Welcome, ${userData?.name}`}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {loading ? <Skeleton width={300} sx={{ mx: 'auto' }} /> : getRoleWelcomeMessage()}
        </Typography>
      </Box>

      {/* Server Mode Alert */}
      {isServer(userData) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Server Mode:</strong> You can quickly check allergens and view specials for guests.
        </Alert>
      )}

      {/* Settings Buttons */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
        >
          {(() => {
            const buttons = getSettingsButtons();
            console.log('🔍 Settings buttons:', { buttons, isArray: Array.isArray(buttons), type: typeof buttons, userData });
            return (Array.isArray(buttons) ? buttons : []).map((btn) => (
              <Button
              key={btn.label}
              variant={btn.color ? 'contained' : 'outlined'}
              color={btn.color || 'primary'}
              startIcon={btn.icon}
              onClick={btn.onClick}
              sx={{ minWidth: 160 }}
            >
              {btn.label}
            </Button>
            ));
          })()}
        </Stack>
      </Paper>

      {/* Search Bar */}
      <RestaurantSearchBar
        onFilterChange={handleFilterChange}
        initialFilters={searchFilters}
      />

      <Divider sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {canUserEditRestaurants(userData) ? 'Your Restaurants' : 'Available Restaurants'}
          {totalRestaurants > 0 && ` (${totalRestaurants} ${totalRestaurants === 1 ? 'result' : 'results'})`}
        </Typography>
      </Divider>

      {/* Restaurants Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : restaurants.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <StorefrontIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No restaurants found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {canUserEditRestaurants(userData)
              ? 'Click "Add Restaurant" to get started'
              : 'Try adjusting your search filters'}
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {restaurants.map((restaurant) => (
              <Grid item xs={12} sm={6} md={4} key={restaurant.id}>
                <RestaurantCard
                  restaurant={restaurant}
                  onSelect={handleRestaurantCardClick}
                  onDelete={handleRestaurantDelete}
                  canDelete={canUserEditRestaurants(userData)}
                  isServerMode={isServer(userData)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={searchFilters.page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Restaurant Details Dialog */}
      <RestaurantDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        restaurantId={selectedRestaurant?.id}
        onStartChat={handleStartChat}
      />
    </Container>
  );
};

export default DashboardScreen;
