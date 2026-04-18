import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
  Alert,
  CircularProgress,
  InputAdornment,
  Link,
  Divider,
  Collapse,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import { UserContext } from '../UserContext';
import { supabase } from '../services/supabaseClient';
import { getOrCreateDatabaseUser } from '../services/userMappingService';
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';

const CreateAccountScreen = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCodeValid, setInviteCodeValid] = useState(null);
  const [inviteCodeType, setInviteCodeType] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [termsAcceptance, setTermsAcceptance] = useState(null);
  const navigate = useNavigate();
  const { setUserId} = useContext(UserContext);

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId !== null) {
          setUserId(storedUserId);
          navigate('/dashboard');
        } else {
          setCheckingAuth(false);
        }
      } catch (error) {
        console.log('not going to dashboard', error);
        setCheckingAuth(false);
      }
    };
    loadUserId();
  }, [navigate, setUserId]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate invite code if provided
    if (inviteCodeValid === false) {
      setError('Please enter a valid invite code or leave it blank.');
      return;
    }

    // CRITICAL: Show Terms & Conditions modal BEFORE account creation
    setShowTermsModal(true);
  };

  const handleTermsAccept = async (acceptanceData) => {
    setShowTermsModal(false);
    setTermsAcceptance(acceptanceData);
    setLoading(true);
    setError(null);

    try {
      // Use Supabase Auth to create account
      const { data, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name, // Store name in user metadata
            termsAccepted: true,
            termsVersion: acceptanceData.version,
            termsAcceptedAt: acceptanceData.acceptedAt,
          }
        }
      });

      if (authError) {
        setError(authError.message || 'Failed to create account');
        setLoading(false);
        return;
      }

      if (!data.session) {
        // Email confirmation may be required
        setError('Account created! Please check your email to confirm your account before logging in.');
        setLoading(false);
        return;
      }

      // Map Supabase UUID to legacy integer user ID with invite code
      const legacyUserId = await getOrCreateDatabaseUser(inviteCode);

      if (legacyUserId) {
        localStorage.setItem('userId', `${legacyUserId}`);
        await setUserId(legacyUserId);
        navigate('/dashboard');
      } else {
        setError('Account created but failed to initialize. Please try logging in.');
        setLoading(false);
      }
    } catch (error) {
      setError(`An error occurred during account creation: ${error.message || error}`);
      setLoading(false);
    }
  };

  const handleTermsClose = () => {
    setShowTermsModal(false);
    setLoading(false);
  };

  if (checkingAuth) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Checking authentication...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
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
            <PersonAddIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join Chat With Menu to get personalized dining recommendations
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Form */}
        <Box component="form" onSubmit={handleCreate}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              id="name"
              name="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              id="password"
              name="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
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
                {showInviteCode ? 'Hide' : 'Have an'} invite code?
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
                    : 'Optional: Enter code for special account access'
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

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading || inviteCodeValid === false}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Stack>
        </Box>

        {/* Footer */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Sign in
            </Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            By creating an account, you agree to our{' '}
            <Link component={RouterLink} to="/terms" underline="hover">
              Terms & Conditions
            </Link>
            {' '}and{' '}
            <Link component={RouterLink} to="/privacy-policy" underline="hover">
              Privacy Policy
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        open={showTermsModal}
        onClose={handleTermsClose}
        onAccept={handleTermsAccept}
      />

      {/* Privacy Policy Modal (optional view) */}
      <PrivacyPolicyModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </Container>
  );
};

export default CreateAccountScreen;
