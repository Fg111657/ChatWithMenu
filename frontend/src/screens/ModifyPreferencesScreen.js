import React, { useState, useEffect, useContext } from 'react';
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
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Snackbar,
  Divider,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import MicIcon from '@mui/icons-material/Mic';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import dataService from '../services/dataService';
import { FOODS } from '../randomText';
import FeedbackScale from '../components/FeedbackScale';
import AudioRecorderModal from '../components/AudioRecorderModal';
import { UserContext } from '../UserContext';
import { useLocation, useNavigate } from 'react-router-dom';

const ModifyPreferencesScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const restrictionType = location.state?.restrictionType;
  const { userId } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [audioRecordingState, setAudioRecordingState] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Get config based on restriction type
  const getTypeConfig = () => {
    switch (restrictionType) {
      case 'allergy':
        return {
          icon: <ReportProblemIcon sx={{ fontSize: 40 }} />,
          title: 'Manage Allergies',
          subtitle: 'Keep your allergy information up to date for safe dining',
          addLabel: 'Add Allergy',
          color: 'error.main',
        };
      case 'preference':
        return {
          icon: <TuneIcon sx={{ fontSize: 40 }} />,
          title: 'Food Preferences',
          subtitle: 'Tell us what you love and what you\'d rather avoid',
          addLabel: 'Add Preference',
          color: 'primary.main',
        };
      default:
        return {
          icon: <RestaurantIcon sx={{ fontSize: 40 }} />,
          title: 'Dietary Settings',
          subtitle: 'Customize your dietary requirements',
          addLabel: 'Add Item',
          color: 'primary.main',
        };
    }
  };

  const typeConfig = getTypeConfig();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const foodPrefs = await dataService.loadUserPreferences(userId, restrictionType);
        setDietaryRestrictions(foodPrefs);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setError('Failed to load preferences');
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId, restrictionType]);

  const handleInputChange = (index, field, value) => {
    const updatedRestrictions = dietaryRestrictions.map((item, i) => {
      if (index === i) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setDietaryRestrictions(updatedRestrictions);
  };

  const saveChanges = async () => {
    setSaving(true);
    setError(null);
    try {
      await dataService.saveUserPreferences(userId, dietaryRestrictions, restrictionType);
      setSuccessMessage('Changes saved successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.log(error);
      setError('Failed to save changes');
      setSaving(false);
    }
  };

  const addPref = () => {
    setDietaryRestrictions((prefs) => [
      ...prefs,
      {
        ingredient: FOODS[Math.floor(Math.random() * FOODS.length)],
        level: Math.random() * 2 - 1,
      },
    ]);
  };

  const deleteDietaryRestriction = (index) => {
    const updatedRestrictions = dietaryRestrictions.filter((_, i) => i !== index);
    setDietaryRestrictions(updatedRestrictions);
  };

  const startRecording = () => {
    setAudioRecordingState('recording');
  };

  const saveRecording = async (audio) => {
    setAudioRecordingState('loading');
    try {
      let data = await dataService.saveUserPrefrencesAudio(userId, audio, restrictionType);
      setDietaryRestrictions(data);
      setAudioRecordingState('complete');
      setSuccessMessage('Voice recording processed successfully!');
    } catch (error) {
      console.error('Error sending data', error);
      setAudioRecordingState('error');
      setError('Failed to process voice recording');
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading preferences...
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
              bgcolor: typeConfig.color,
              mx: 'auto',
              mb: 2,
            }}
          >
            {typeConfig.icon}
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            {typeConfig.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {typeConfig.subtitle}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Voice Recording Section (not for allergies) */}
        {restrictionType !== 'allergy' && (
          <Box sx={{ mb: 3 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<MicIcon />}
              onClick={startRecording}
              disabled={audioRecordingState === 'loading'}
              sx={{ mb: 2 }}
            >
              Record Preferences
            </Button>

            {audioRecordingState === 'recording' && (
              <AudioRecorderModal onStop={saveRecording} />
            )}

            {audioRecordingState === 'loading' && (
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                <CircularProgress size={32} sx={{ mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Processing your recording...
                </Typography>
              </Paper>
            )}

            {audioRecordingState === 'complete' && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Recording processed! Review your preferences below.
              </Alert>
            )}

            {audioRecordingState === 'error' && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to process recording. Please try again.
              </Alert>
            )}
          </Box>
        )}

        {restrictionType !== 'allergy' && dietaryRestrictions.length > 0 && (
          <Divider sx={{ mb: 3 }} />
        )}

        {/* Preferences List */}
        <Stack spacing={2}>
          {dietaryRestrictions.map((item, index) => (
            <Card key={index} variant="outlined" sx={{ overflow: 'visible' }}>
              <CardContent sx={{ pb: restrictionType === 'allergy' ? 2 : 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Ingredient"
                    value={item.ingredient}
                    onChange={(e) => handleInputChange(index, 'ingredient', e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocalDiningIcon color="action" fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <IconButton
                    onClick={() => deleteDietaryRestriction(index)}
                    color="error"
                    size="small"
                    sx={{ mt: 0.5 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

                {restrictionType !== 'allergy' && (
                  <Box sx={{ mt: 2 }}>
                    <FeedbackScale
                      scaleText="Preference Level"
                      selectedNumber={Math.min(Math.max(1, Math.round((item.level + 1) * 5)), 10)}
                      setSelectedNumber={(value) => handleInputChange(index, 'level', value / 5 - 1)}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}

          {dietaryRestrictions.length === 0 && (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <LocalDiningIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography color="text.secondary">
                No {restrictionType === 'allergy' ? 'allergies' : 'preferences'} added yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click the button below to add one
              </Typography>
            </Paper>
          )}
        </Stack>

        {/* Action Buttons */}
        <Stack spacing={2} sx={{ mt: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addPref}
          >
            {typeConfig.addLabel}
          </Button>

          <Divider />

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dashboard')}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={saveChanges}
              disabled={saving}
              sx={{ flex: 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={successMessage !== null}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ModifyPreferencesScreen;
