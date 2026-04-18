import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import FeaturesIcon from '@mui/icons-material/AutoAwesome';
import PricingIcon from '@mui/icons-material/LocalOffer';
import LogoutIcon from '@mui/icons-material/Logout';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import GroupIcon from '@mui/icons-material/Group';
import { useCart } from './contexts/CartContext';
import ShoppingCartDrawer from './components/Cart/ShoppingCartDrawer';

const navItems = [
  { label: 'About', path: '/about', icon: <InfoIcon /> },
  { label: 'Features', path: '/how-it-works', icon: <FeaturesIcon /> },
  { label: 'Pricing', path: '/pricing', icon: <PricingIcon /> },
];

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const { itemCount } = useCart();

  const isLoggedIn = localStorage && localStorage.length > 0;

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const isActive = (path) => location.pathname === path;

  const drawer = (
    <Box sx={{ width: 280 }} role="presentation">
      <Box
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component="img" src="/assets/logos/logo-white.webp" alt="Chat With Menu Logo" sx={{ height: 32 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Chat With Menu
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            to="/dashboard"
            selected={isActive('/dashboard')}
            onClick={handleDrawerToggle}
          >
            <ListItemIcon>
              <DashboardIcon color={isActive('/dashboard') ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        {isLoggedIn && (
          <>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  handleDrawerToggle();
                  setCartDrawerOpen(true);
                }}
              >
                <ListItemIcon>
                  <Badge badgeContent={itemCount} color="primary">
                    <ShoppingCartIcon />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary="Shopping Cart" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/order-history"
                selected={isActive('/order-history')}
                onClick={handleDrawerToggle}
              >
                <ListItemIcon>
                  <HistoryIcon color={isActive('/order-history') ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Order History" />
              </ListItemButton>
            </ListItem>
          </>
        )}
        <Divider sx={{ my: 1 }} />
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              onClick={handleDrawerToggle}
            >
              <ListItemIcon>
                {React.cloneElement(item.icon, {
                  color: isActive(item.path) ? 'primary' : 'inherit',
                })}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {isLoggedIn && (
        <>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  handleDrawerToggle();
                  logout();
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <LogoutIcon color="error" />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          component={Link}
          to={isLoggedIn ? '/dashboard' : '/'}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
            gap: 1,
            flexGrow: { xs: 1, md: 0 },
            mr: { md: 4 },
          }}
        >
          <Box component="img" src="/assets/logos/logo-blue.webp" alt="Chat With Menu Logo" sx={{ height: 28 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Chat With Menu
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{
                color: isActive(item.path) ? 'primary.main' : 'text.secondary',
                fontWeight: isActive(item.path) ? 600 : 500,
                '&:hover': {
                  bgcolor: 'grey.100',
                  color: 'primary.main',
                },
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
          {isLoggedIn && (
            <>
              <IconButton
                color="inherit"
                onClick={() => setCartDrawerOpen(true)}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={itemCount} color="primary">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
              <Button
                variant="text"
                color="inherit"
                component={Link}
                to="/order-history"
                startIcon={<HistoryIcon />}
                sx={{
                  color: isActive('/order-history') ? 'primary.main' : 'text.secondary',
                  fontWeight: isActive('/order-history') ? 600 : 500,
                }}
              >
                Orders
              </Button>
            </>
          )}
          {isLoggedIn ? (
            <Button
              variant="outlined"
              color="primary"
              onClick={logout}
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          ) : (
            <Button
              variant="contained"
              component={Link}
              to="/login"
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
        }}
      >
        {drawer}
      </Drawer>

      <ShoppingCartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />
    </AppBar>
  );
};

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <NavBar />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
