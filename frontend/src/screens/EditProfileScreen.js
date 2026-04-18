import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Container,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Avatar,
  Stack,
  InputAdornment,
  Alert,
  Collapse,
  Link,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import NotesIcon from '@mui/icons-material/Notes';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import dataService from '../services/dataService';
import { useLocation, useNavigate } from 'react-router-dom';

const EditProfile = ({ userId: propUserId, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = propUserId || location.state?.userId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState(null); // null = not checked, true = valid, false = invalid
  const [inviteCodeType, setInviteCodeType] = useState(''); // Merchant, Waiter, etc.
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    bio: '',
    account_type: 0,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        let data = await dataService.loadUserData(userId);
        setProfile({
          name: data.name,
          email: data.email,
          bio: data.bio || '',
          account_type: data.account_type,
        });
        setLoading(false);
      } catch (error) {
        console.log(error);
        setError('Failed to load profile');
        setLoading(false);
      }
    };
    if (userId !== undefined) loadUser();
  }, [userId]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Validate invite code (client-side matching backend logic)
  const validateInviteCode = (code) => {
    const trimmed = code.trim();

    if (!trimmed) {
      setInviteCodeValid(null);
      setInviteCodeType('');
      return;
    }

    // Valid codes from backend invite_codes.py
    const validCodes = {
      '1122': 'Merchant',
      '2211': 'Waiter',
      '1212': 'Diner',
      'DEV-INVITE': 'Developer',
      'CWM-BETA': 'Beta Tester',
      'ILVIOLINO': 'Special Access'
    };

    if (validCodes[trimmed]) {
      setInviteCodeValid(true);
      setInviteCodeType(validCodes[trimmed]);
    } else {
      setInviteCodeValid(false);
      setInviteCodeType('');
    }
  };

  const handleInviteCodeChange = (e) => {
    const newCode = e.target.value;
    setInviteCode(newCode);
    validateInviteCode(newCode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // If invite code provided, send it to upgrade account type
      const updateData = { ...profile };
      if (inviteCode.trim()) {
        updateData.invite_code = inviteCode.trim();
      }
      await dataService.modifyUserData(userId, updateData);

      // Show success message
      if (inviteCode.trim()) {
        setSuccess('Profile updated! Your account has been upgraded. Redirecting...');
      } else {
        setSuccess('Profile updated successfully! Redirecting...');
      }

      setTimeout(() => {
        if (onBack) {
          onBack();
        } else {
          window.location.href = '/dashboard';
        }
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message || 'Failed to save changes. Please check your connection and try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading profile...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 1, sm: 2 } }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              mx: 'auto',
              mb: 2,
            }}
          >
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Edit Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update your personal information
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="account-type-label">Account Type</InputLabel>
              <Select
                labelId="account-type-label"
                id="account_type"
                name="account_type"
                value={profile.account_type}
                label="Account Type"
                onChange={handleChange}
                startAdornment={
                  <InputAdornment position="start">
                    <BadgeIcon color="action" />
                  </InputAdornment>
                }
              >
                <MenuItem value={0}>Normal User</MenuItem>
                <MenuItem value={2}>Merchant</MenuItem>
                <MenuItem value={3}>Waiter</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              id="name"
              name="name"
              label="Name"
              value={profile.name}
              onChange={handleChange}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={profile.email}
              onChange={handleChange}
              required
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
              id="bio"
              name="bio"
              label="Bio"
              value={profile.bio}
              onChange={handleChange}
              multiline
              rows={4}
              placeholder="Tell us about yourself and your food preferences..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                    <NotesIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setShowInviteCode(!showInviteCode)}
                sx={{ cursor: 'pointer', textDecoration: 'none' }}
              >
                {showInviteCode ? 'Hide' : 'Have an'} invite code to upgrade?
              </Link>
            </Box>

            <Collapse in={showInviteCode}>
              <TextField
                fullWidth
                id="inviteCode"
                name="inviteCode"
                label="Invite Code"
                type="text"
                value={inviteCode}
                onChange={handleInviteCodeChange}
                placeholder="Enter your code (e.g., 1122, 2211)"
                helperText={
                  inviteCodeValid === true
                    ? `✅ Code accepted: ${inviteCodeType} access`
                    : inviteCodeValid === false
                    ? '❌ Invalid invite code'
                    : 'Optional: Enter code to upgrade your account'
                }
                error={inviteCodeValid === false}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKeyIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
            </Collapse>

            <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  if (onBack) onBack();
                  else navigate('/dashboard');
                }}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving || inviteCodeValid === false}
                sx={{ flex: 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditProfile;
