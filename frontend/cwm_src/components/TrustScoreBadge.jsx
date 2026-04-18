import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  LinearProgress,
  Tooltip,
  Typography,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import dataService from '../services/dataService';

// Color mapping for confidence states
const CONFIDENCE_COLORS = {
  high_confidence: {
    color: 'success',
    bgcolor: 'success.light',
    textColor: 'success.dark',
    icon: <CheckCircleIcon fontSize="small" />,
    label: 'High Confidence',
  },
  medium_confidence: {
    color: 'warning',
    bgcolor: 'warning.light',
    textColor: 'warning.dark',
    icon: <InfoIcon fontSize="small" />,
    label: 'Medium Confidence',
  },
  low_confidence: {
    color: 'warning',
    bgcolor: 'orange.200',
    textColor: 'orange.800',
    icon: <InfoIcon fontSize="small" />,
    label: 'Low Confidence',
  },
  insufficient_data: {
    color: 'default',
    bgcolor: 'grey.300',
    textColor: 'text.secondary',
    icon: <InfoIcon fontSize="small" />,
    label: 'Insufficient Data',
  },
  conflicting_signals: {
    color: 'error',
    bgcolor: 'error.light',
    textColor: 'error.dark',
    icon: <WarningIcon fontSize="small" />,
    label: 'Conflicting Signals',
  },
};

// Format restriction name for display
const formatRestrictionName = (restriction) => {
  return restriction
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Convert trust score (0.0-1.0) to percentage
const scoreToPercentage = (score) => {
  if (score == null) return 0;
  return Math.round(score * 100);
};

// Single trust score item display
const TrustScoreItem = ({ scoreData }) => {
  const {
    restriction,
    trust_score,
    confidence_state,
    signal_count = 0,
  } = scoreData;

  const confidenceConfig = CONFIDENCE_COLORS[confidence_state] || CONFIDENCE_COLORS.insufficient_data;
  const percentage = scoreToPercentage(trust_score);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mb: 1,
      }}
    >
      <Stack spacing={1}>
        {/* Header: Restriction name and confidence badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" fontWeight={600}>
            {formatRestrictionName(restriction)}
          </Typography>
          <Tooltip title={confidenceConfig.label}>
            <Chip
              icon={confidenceConfig.icon}
              label={confidenceConfig.label}
              size="small"
              color={confidenceConfig.color}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Tooltip>
        </Box>

        {/* Trust Score Bar */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Trust Score
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {percentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                bgcolor: confidence_state === 'conflicting_signals'
                  ? 'error.main'
                  : confidence_state === 'high_confidence'
                  ? 'success.main'
                  : confidence_state === 'medium_confidence'
                  ? 'warning.main'
                  : 'grey.500',
              },
            }}
          />
        </Box>

        {/* Signal count */}
        <Typography variant="caption" color="text.secondary">
          {signal_count} {signal_count === 1 ? 'signal' : 'signals'}
        </Typography>
      </Stack>
    </Box>
  );
};

const TrustScoreBadge = ({ restaurantId, restriction }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trustScores, setTrustScores] = useState([]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    fetchTrustScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const fetchTrustScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dataService.getRestaurantTrustScores(restaurantId);

      // data.trust_scores should be an array of trust score objects
      const scores = data.trust_scores || [];

      // If restriction filter is provided, filter to only that restriction
      if (restriction) {
        const filtered = scores.filter(s => s.restriction === restriction);
        setTrustScores(filtered);
      } else {
        setTrustScores(scores);
      }
    } catch (err) {
      console.error('Failed to fetch trust scores:', err);
      setError('Failed to load trust scores');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {error}
      </Alert>
    );
  }

  // No data state
  if (trustScores.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: 'grey.50',
          border: 1,
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No trust data yet
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Trust scores will appear as user reviews are collected
        </Typography>
      </Box>
    );
  }

  // Display trust scores
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 1.5 }}>
        Trust Scores
      </Typography>
      <Stack spacing={0}>
        {trustScores.map((scoreData) => (
          <TrustScoreItem key={scoreData.restriction} scoreData={scoreData} />
        ))}
      </Stack>
    </Box>
  );
};

export default TrustScoreBadge;
