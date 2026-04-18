import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import { supabase } from '../services/supabaseClient';
import { getOrCreateDatabaseUser } from '../services/userMappingService';

import {
  Button,
  Paper,
  Container,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUserId } = useContext(UserContext);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Use Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        setError(authError.message || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (!data.session) {
        setError('No session created. Please try again.');
        setLoading(false);
        return;
      }

      // Map Supabase UUID to legacy integer user ID
      const legacyUserId = await getOrCreateDatabaseUser();

      if (legacyUserId) {
        localStorage.setItem('userId', `${legacyUserId}`);
        setUserId(legacyUserId);
        navigate('/dashboard');
      } else {
        setError('Failed to create user session. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      setError(`An error occurred during login: ${error.message || error}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId !== null) {
      setUserId(storedUserId);
      navigate('/dashboard');
    }
  }, [navigate, setUserId]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo/Brand */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <RestaurantMenuIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Chat With Menu
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sign in to continue
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            variant="outlined"
            type="email"
            label="Email"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            disabled={loading}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            variant="outlined"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            disabled={loading}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading || !email || !password}
            sx={{ py: 1.5, mb: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ width: '100%', my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        <Button
          variant="outlined"
          color="primary"
          fullWidth
          size="large"
          onClick={() => navigate('/create-account')}
          sx={{ py: 1.5 }}
        >
          Create New Account
        </Button>
      </Paper>
    </Container>
  );
};

export default LoginScreen;
