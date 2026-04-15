import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';

import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Alert,
  Skeleton,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleIcon from '@mui/icons-material/People';
import MailIcon from '@mui/icons-material/Mail';
import ExploreIcon from '@mui/icons-material/Explore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CloseIcon from '@mui/icons-material/Close';

// Connection strength indicator
const ConnectionStrengthBadge = ({ strength }) => {
  const getColor = () => {
    if (strength >= 8) return 'success';
    if (strength >= 5) return 'primary';
    if (strength >= 3) return 'warning';
    return 'default';
  };

  const getLabel = () => {
    if (strength >= 8) return 'Strong';
    if (strength >= 5) return 'Growing';
    if (strength >= 3) return 'New';
    return 'Just Connected';
  };

  return (
    <Chip
      size="small"
      label={getLabel()}
      color={getColor()}
      icon={<FavoriteIcon />}
      sx={{ fontWeight: 600 }}
    />
  );
};

// Connection Card Component
const ConnectionCard = ({ connection, onViewProfile }) => {
  return (
    <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {connection.name?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {connection.name || 'Unknown User'}
            </Typography>
            <ConnectionStrengthBadge strength={connection.connection_strength || 0} />
          </Box>
        </Box>

        {connection.bio && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {connection.bio}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={<QuestionAnswerIcon />}
            label={`${connection.help_count || 0} helps`}
            variant="outlined"
          />
          {connection.shared_restaurants && (
            <Chip
              size="small"
              label={`${connection.shared_restaurants} shared spots`}
              variant="outlined"
            />
          )}
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => onViewProfile(connection)}>
          View Profile
        </Button>
        <Button size="small" color="primary">
          Send Message
        </Button>
      </CardActions>
    </Card>
  );
};

// Pending Invite Card Component
const PendingInviteCard = ({ invite, onAccept, onDecline }) => {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'secondary.main',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {invite.sender_name?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {invite.sender_name || 'Unknown User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {invite.created_at ? new Date(invite.created_at).toLocaleDateString() : 'Recently'}
            </Typography>
          </Box>
        </Box>

        {invite.message && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              "{invite.message}"
            </Typography>
          </Paper>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<CancelIcon />}
          onClick={() => onDecline(invite.id)}
        >
          Decline
        </Button>
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={() => onAccept(invite.id)}
        >
          Accept
        </Button>
      </CardActions>
    </Card>
  );
};

// Send Invite Dialog Component
const SendInviteDialog = ({ open, onClose, onSend }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSend({ email: email.trim(), message: message.trim() });
      setEmail('');
      setMessage('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAddIcon />
            Send Table Invitation
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Invite someone to join your table and help each other discover safe dining options.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          sx={{ mb: 3 }}
          required
        />

        <TextField
          fullWidth
          label="Personal Message (Optional)"
          multiline
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hey! I'd love to connect on CWM and help each other find safe places to eat..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading}
          startIcon={<MailIcon />}
        >
          {loading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main My Table Screen Component
const MyTableScreen = () => {
  const navigate = useNavigate();
  const { userId, isInitialized } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [connections, setConnections] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    connections: 0,
    pending_invites: 0,
    questions_answered: 0,
  });

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (userId === null || userId === undefined) {
      navigate('/login');
      return;
    }

    fetchTableData();
  }, [userId, isInitialized, navigate]);

  const fetchTableData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [connectionsData, invitesData, suggestionsData] = await Promise.all([
        dataService.getMyTableConnections().catch(() => []),
        dataService.getMyTableInvites().catch(() => []),
        dataService.getMyTableSuggestions().catch(() => []),
      ]);

      setConnections(connectionsData || []);
      setPendingInvites(invitesData || []);
      setSuggestedUsers(suggestionsData || []);

      // Calculate stats
      setStats({
        connections: (connectionsData || []).length,
        pending_invites: (invitesData || []).length,
        questions_answered: (connectionsData || []).reduce(
          (sum, conn) => sum + (conn.help_count || 0),
          0
        ),
      });
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError('Failed to load My Table data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (inviteData) => {
    try {
      await dataService.sendMyTableInvite(inviteData);
      setSuccess('Invitation sent successfully!');
      fetchTableData();
    } catch (err) {
      throw new Error(err.message || 'Failed to send invitation');
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await dataService.acceptMyTableInvite(inviteId);
      setSuccess('Invitation accepted! You are now connected.');
      fetchTableData();
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
      console.error('Error accepting invite:', err);
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    try {
      await dataService.declineMyTableInvite(inviteId);
      setSuccess('Invitation declined.');
      fetchTableData();
    } catch (err) {
      setError('Failed to decline invitation. Please try again.');
      console.error('Error declining invite:', err);
    }
  };

  const handleViewProfile = (connection) => {
    console.log('View profile:', connection);
    // TODO: Navigate to profile view or open profile dialog
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <GroupsIcon sx={{ fontSize: 40, color: '#0077B6' }} />
          <Typography variant="h4" fontWeight={700}>
            My Table
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Connect with others who understand dining with dietary restrictions
        </Typography>
      </Box>

      {/* Info Card */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #0077B6 0%, #005f8d 100%)',
          color: 'white',
        }}
        elevation={3}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 40 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Build Your Support Network
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              My Table lets you connect with other diners, share restaurant discoveries,
              ask questions, and create safety signals for places you trust. Together,
              we make dining out safer and more enjoyable for everyone.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      {!loading && (
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }} elevation={2}>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {stats.connections}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active {stats.connections === 1 ? 'Connection' : 'Connections'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }} elevation={2}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {stats.pending_invites}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending {stats.pending_invites === 1 ? 'Invite' : 'Invites'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }} elevation={2}>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {stats.questions_answered}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Questions Answered
              </Typography>
            </Paper>
          </Stack>
        </Box>
      )}

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{ bgcolor: '#0077B6', '&:hover': { bgcolor: '#005f8d' } }}
          >
            Send Invite
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<QuestionAnswerIcon />}
            onClick={() => navigate('/table-questions')}
          >
            Ask Question
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<NotificationsActiveIcon />}
            onClick={() => navigate('/safety-signals')}
          >
            Create Signal
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            label={`Connections (${stats.connections})`}
          />
          <Tab
            icon={<MailIcon />}
            iconPosition="start"
            label={`Invites (${stats.pending_invites})`}
          />
          <Tab
            icon={<ExploreIcon />}
            iconPosition="start"
            label="Discovery"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {/* Active Connections Tab */}
          {activeTab === 0 && (
            <>
              {connections.length === 0 ? (
                <Paper
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    border: '2px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Connections Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Start building your table by sending invitations to friends and family.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => setInviteDialogOpen(true)}
                    sx={{ bgcolor: '#0077B6', '&:hover': { bgcolor: '#005f8d' } }}
                  >
                    Send Your First Invite
                  </Button>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {connections.map((connection) => (
                    <Grid item xs={12} md={6} key={connection.id}>
                      <ConnectionCard
                        connection={connection}
                        onViewProfile={handleViewProfile}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* Pending Invitations Tab */}
          {activeTab === 1 && (
            <>
              {pendingInvites.length === 0 ? (
                <Paper
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    border: '2px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <MailIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Pending Invites
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    When someone invites you to their table, it will appear here.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {pendingInvites.map((invite) => (
                    <Grid item xs={12} md={6} key={invite.id}>
                      <PendingInviteCard
                        invite={invite}
                        onAccept={handleAcceptInvite}
                        onDecline={handleDeclineInvite}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* Discovery Tab */}
          {activeTab === 2 && (
            <>
              {suggestedUsers.length === 0 ? (
                <Paper
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    border: '2px dashed',
                    borderColor: 'divider',
                  }}
                >
                  <ExploreIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Suggestions Available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We'll suggest people to connect with based on shared restaurants and dietary needs.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {suggestedUsers.map((user) => (
                    <Grid item xs={12} md={6} key={user.id}>
                      <Card elevation={2}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: 'success.main',
                                fontSize: 20,
                                fontWeight: 700,
                              }}
                            >
                              {user.name?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="h6" fontWeight={600}>
                                {user.name || 'Unknown User'}
                              </Typography>
                              <Chip
                                size="small"
                                label="Suggested"
                                color="success"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                          {user.match_reason && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {user.match_reason}
                            </Typography>
                          )}
                        </CardContent>
                        <CardActions>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            onClick={() => {
                              // TODO: Pre-fill invite dialog with this user
                              setInviteDialogOpen(true);
                            }}
                          >
                            Send Invite
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </>
      )}

      {/* Send Invite Dialog */}
      <SendInviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onSend={handleSendInvite}
      />
    </Container>
  );
};

export default MyTableScreen;
