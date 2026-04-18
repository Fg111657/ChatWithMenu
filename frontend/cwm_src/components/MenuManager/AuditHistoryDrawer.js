import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dataService from '../../services/dataService';

const ACTION_ICONS = {
  'MENU_UPDATED': <EditIcon fontSize="small" />,
  'MENU_CREATED': <AddIcon fontSize="small" />,
  'MENU_DELETED': <DeleteIcon fontSize="small" />,
  'ITEM_UPDATED': <EditIcon fontSize="small" />,
  'RESTAURANT_UPDATED': <EditIcon fontSize="small" />,
  'RESTAURANT_CREATED': <AddIcon fontSize="small" />,
  'RESTAURANT_DELETED': <DeleteIcon fontSize="small" />
};

const ACTION_COLORS = {
  'MENU_UPDATED': 'primary',
  'MENU_CREATED': 'success',
  'MENU_DELETED': 'error',
  'ITEM_UPDATED': 'info',
  'RESTAURANT_UPDATED': 'primary',
  'RESTAURANT_CREATED': 'success',
  'RESTAURANT_DELETED': 'error'
};

function AuditHistoryDrawer({ open, onClose, restaurantId, currentMenuId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterMenuOnly, setFilterMenuOnly] = useState(false);
  const [filterActionType, setFilterActionType] = useState('');
  const [filterActor, setFilterActor] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('30'); // days

  useEffect(() => {
    if (!open || !restaurantId) return;

    fetchHistory();
  }, [open, restaurantId, filterMenuOnly, filterActionType, filterActor, filterDateRange]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      });

      if (filterMenuOnly && currentMenuId) {
        params.append('menu_id', currentMenuId);
      }

      if (filterActionType) {
        params.append('action_type', filterActionType);
      }

      if (filterActor) {
        params.append('actor_email', filterActor);
      }

      if (filterDateRange && filterDateRange !== 'all') {
        const daysAgo = parseInt(filterDateRange);
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - daysAgo);
        params.append('since', sinceDate.toISOString());
      }

      const data = await dataService.getAuditHistory(restaurantId, params.toString().catch(() => []));
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to fetch audit history:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  // Get unique actors for dropdown
  const uniqueActors = [...new Set(entries.map(e => e.actor_email))];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 480 } }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">Audit History</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filterDateRange}
              label="Date Range"
              onChange={(e) => setFilterDateRange(e.target.value)}
            >
              <MenuItem value="1">Last 24 hours</MenuItem>
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="all">All time</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Action Type</InputLabel>
            <Select
              value={filterActionType}
              label="Action Type"
              onChange={(e) => setFilterActionType(e.target.value)}
            >
              <MenuItem value="">All Actions</MenuItem>
              <MenuItem value="MENU_CREATED">Created</MenuItem>
              <MenuItem value="MENU_UPDATED">Updated</MenuItem>
              <MenuItem value="MENU_DELETED">Deleted</MenuItem>
              <MenuItem value="ITEM_UPDATED">Item Updated</MenuItem>
              <MenuItem value="RESTAURANT_UPDATED">Restaurant Updated</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>User / Actor</InputLabel>
            <Select
              value={filterActor}
              label="User / Actor"
              onChange={(e) => setFilterActor(e.target.value)}
            >
              <MenuItem value="">All Users</MenuItem>
              {uniqueActors.map(actor => (
                <MenuItem key={actor} value={actor}>{actor}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={filterMenuOnly}
                onChange={(e) => setFilterMenuOnly(e.target.checked)}
              />
            }
            label="Show current menu only"
          />
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
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

        {!loading && !error && entries.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No history entries found
          </Typography>
        )}

        {!loading && !error && entries.length > 0 && (
          <List>
            {entries.map((entry, index) => (
              <React.Fragment key={entry.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: 'column',
                    gap: 1,
                    bgcolor: index % 2 === 0 ? 'grey.50' : 'white',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Chip
                      icon={ACTION_ICONS[entry.action_type]}
                      label={entry.action_type.replace(/_/g, ' ')}
                      color={ACTION_COLORS[entry.action_type] || 'default'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {formatTimestamp(entry.created_at)}
                    </Typography>
                  </Box>

                  <ListItemText
                    primary={entry.diff_summary}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.secondary">
                          by {entry.actor_email}
                        </Typography>
                        {entry.entity_id && (
                          <Typography component="span" variant="body2" color="text.secondary">
                            {' • '}Entity: {entry.entity_type}:{entry.entity_id}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                    sx={{ m: 0 }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}

export default AuditHistoryDrawer;
