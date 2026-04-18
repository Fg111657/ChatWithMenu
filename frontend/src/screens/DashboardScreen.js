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

import DiscoveryScreen from "../features/discovery/DiscoveryScreen";
import EditProfileScreen from './EditProfileScreen';
import ModifyPreferencesScreen from './ModifyPreferencesScreen';
import FamilyManagementScreen from './FamilyManagementScreen';
import MyTableScreen from './MyTableScreen';
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
  const [activeTab, setActiveTab] = useState('discovery');

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
    { label: 'Restaurant Discovery', icon: <RestaurantIcon />, id: 'discovery', color: 'primary' },
    { label: 'Edit Profile', icon: <PersonIcon />, id: 'edit-profile', color: 'info' },
    { label: 'My Allergies', icon: <WarningIcon />, id: 'allergies', color: 'error' },
    { label: 'My Preferences', icon: <TuneIcon />, id: 'preferences', color: 'success' },
    { label: 'Manage Family', icon: <FamilyRestroomIcon />, id: 'family', color: 'warning' },
    { label: 'My Table', icon: <GroupsIcon />, id: 'table', color: 'secondary' },
  ];

  const getMerchantButtons = () => [
    { label: 'Restaurant Discovery', icon: <RestaurantIcon />, id: 'discovery' },
    { label: 'Add Restaurant', icon: <AddIcon />, onClick: () => navigate('/add-restaurant'), color: 'secondary' },
    { label: 'Manage Menus', icon: <MenuBookIcon />, onClick: () => navigate('/menu-manager'), color: 'primary' },
    { label: 'Edit Profile', icon: <PersonIcon />, id: 'edit-profile' },
  ];

  const getServerButtons = () => [
    { label: 'Restaurant Discovery', icon: <RestaurantIcon />, id: 'discovery' },
    { label: 'Quick Allergy Check', icon: <WarningIcon />, onClick: () => {}, color: 'error' },
    { label: 'View Specials', icon: <RoomServiceIcon />, onClick: () => {}, color: 'secondary' },
    { label: 'Edit Profile', icon: <PersonIcon />, id: 'edit-profile' },
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
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
      {/* Header with Role Badge */}
      <Box sx={{ mb: { xs: 1, sm: 2 }, textAlign: 'center' }}>
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

      {/* Settings Buttons - Styled as a cwm-filter-bar for homogeneity */}
      <Box 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(14px) saturate(1.1)',
          WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          borderRadius: '22px',
          boxShadow: '0 12px 40px rgba(13, 71, 161, 0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
          p: '14px 16px',
          mb: { xs: 1, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          justifyContent={{ xs: 'flex-start', xl: 'center' }}
          sx={{
            overflowX: 'auto',
            pb: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            maskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 24px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 24px), transparent 100%)',
          }}
        >
          {(() => {
            const buttons = getSettingsButtons();
            
            const getColorTokens = (colorKey) => {
              switch (colorKey) {
                case 'error': return { bg: '#FFE9E9', color: '#9F1818', border: '#F4B6B6', activeBg: '#B91C1C', activeColor: '#fff', activeBorder: '#B91C1C', activeShadow: 'rgba(185,28,28,0.35)' };
                case 'success': return { bg: '#E6FBEF', color: '#0F7A3A', border: '#A6E8C2', activeBg: '#16803C', activeColor: '#fff', activeBorder: '#16803C', activeShadow: 'rgba(22,128,60,0.35)' };
                case 'warning': return { bg: '#FFF3D6', color: '#8A4A00', border: '#F2D08A', activeBg: '#B45309', activeColor: '#fff', activeBorder: '#B45309', activeShadow: 'rgba(180,83,9,0.35)' };
                case 'info': return { bg: '#EEF0FF', color: '#3730A3', border: '#C7CAF0', activeBg: '#4F46E5', activeColor: '#fff', activeBorder: '#4F46E5', activeShadow: 'rgba(79,70,229,0.35)' };
                case 'secondary': return { bg: '#F1E8FE', color: '#5B21B6', border: '#CFBAF0', activeBg: '#7C3AED', activeColor: '#fff', activeBorder: '#7C3AED', activeShadow: 'rgba(124,58,237,0.35)' };
                case 'primary':
                default: return { bg: '#E5F3FF', color: '#0F5FB8', border: '#9FCBF2', activeBg: '#0F7FE8', activeColor: '#fff', activeBorder: '#0F7FE8', activeShadow: 'rgba(15,127,232,0.35)' };
              }
            };
            
            console.log('🔍 Settings buttons:', { buttons, isArray: Array.isArray(buttons), type: typeof buttons, userData });
            return (Array.isArray(buttons) ? buttons : []).map((btn) => {
              const isActive = activeTab === btn.id;
              const tokens = getColorTokens(btn.color || 'primary');
              
              return (
                <Button
                  key={btn.label}
                  startIcon={btn.icon}
                  onClick={btn.onClick ? btn.onClick : () => setActiveTab(btn.id)}
                  sx={{
                    flex: '0 0 auto',
                    scrollSnapAlign: 'start',
                    height: '36px',
                    px: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    borderRadius: '999px',
                    border: '1.5px solid',
                    textTransform: 'none',
                    fontFamily: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: 'normal',
                    lineHeight: 'normal',
                    borderColor: isActive ? tokens.activeBorder : tokens.border,
                    background: isActive ? tokens.activeBg : tokens.bg,
                    color: isActive ? tokens.activeColor : tokens.color,
                    boxShadow: isActive ? `0 4px 12px ${tokens.activeShadow}` : 'none',
                    transition: 'transform 120ms ease, background 160ms ease, color 160ms ease, border-color 160ms ease',
                    '&:hover': {
                      background: isActive ? tokens.activeBg : 'transparent',
                      transform: 'translateY(-1px)'
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: '6px', // natural spacing instead of squishing
                      marginLeft: '-2px',
                      '& > *:first-of-type': { fontSize: '18px' } 
                    }
                  }}
                >
                  {btn.label}
                </Button>
              );
            });
          })()}
        </Stack>
      </Box>



      {/* Restaurant Details Dialog */}
      <RestaurantDetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        restaurantId={selectedRestaurant?.id}
        onStartChat={handleStartChat}
      />

      {/* Tab Content */}
      <Box sx={{ mt: 2 }}>
        {activeTab === 'discovery' && (
          <div style={{ marginTop: 8 }}>
            <DiscoveryScreen userId={userId} withBackdrop={false} />
          </div>
        )}
        {activeTab === 'edit-profile' && <EditProfileScreen userId={userId} onBack={() => setActiveTab('discovery')} />}
        {activeTab === 'allergies' && <ModifyPreferencesScreen restrictionType="allergy" userId={userId} onBack={() => setActiveTab('discovery')} />}
        {activeTab === 'preferences' && <ModifyPreferencesScreen restrictionType="preference" userId={userId} onBack={() => setActiveTab('discovery')} />}
        {activeTab === 'family' && <FamilyManagementScreen onBack={() => setActiveTab('discovery')} />}
        {activeTab === 'table' && <MyTableScreen onBack={() => setActiveTab('discovery')} />}
      </Box>

    </Container>
  );
};

export default DashboardScreen;
