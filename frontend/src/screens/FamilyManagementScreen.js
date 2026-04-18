import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import FamilyMemberCard from '../components/FamilyMemberCard';
import AddFamilyMemberDialog from '../components/AddFamilyMemberDialog';

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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import ShieldIcon from '@mui/icons-material/Shield';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const FamilyManagementScreen = ({ onBack }) => {
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const members = await dataService.getFamilyMembers();
      setFamilyMembers(members);
    } catch (err) {
      setError('Failed to load family members. Please try again.');
      console.error('Error fetching family members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      const newMember = await dataService.addFamilyMember(memberData);
      // Save allergies using the server-assigned member ID
      if (memberData.allergies && memberData.allergies.length > 0) {
        for (const allergy of memberData.allergies) {
          await dataService.addFamilyMemberAllergy(newMember.id, allergy);
        }
      }
      setSuccess(`${memberData.name} has been added to your family! 🎉`);
      setDialogOpen(false);
      setEditingMember(null);
      fetchFamilyMembers();
    } catch (err) {
      setError(`Failed to add family member. ${err.message || 'Please try again.'}`);
      console.error('Error adding family member:', err);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleUpdateMember = async (memberData) => {
    try {
      await dataService.updateFamilyMember(editingMember.id, memberData);
      // Sync allergies: delete removed ones, add new ones
      const oldAllergies = editingMember.allergies || [];
      const newAllergies = memberData.allergies || [];
      // Delete allergies that were removed (have id but aren't in new list)
      const newIds = new Set(newAllergies.filter(a => a.id).map(a => a.id));
      for (const old of oldAllergies) {
        if (!newIds.has(old.id)) {
          await dataService.deleteFamilyMemberAllergy(old.id);
        }
      }
      // Add allergies that are new (no id)
      for (const allergy of newAllergies) {
        if (!allergy.id) {
          await dataService.addFamilyMemberAllergy(editingMember.id, allergy);
        }
      }
      setSuccess(`${memberData.name}'s profile has been updated!`);
      setDialogOpen(false);
      setEditingMember(null);
      fetchFamilyMembers();
    } catch (err) {
      setError('Failed to update family member. Please try again.');
      console.error('Error updating family member:', err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    try {
      await dataService.deleteFamilyMember(memberId);
      setSuccess('Family member has been removed.');
      fetchFamilyMembers();
    } catch (err) {
      setError('Failed to remove family member. Please try again.');
      console.error('Error deleting family member:', err);
    }
  };

  const totalAllergies = familyMembers.reduce(
    (sum, member) => sum + (member.allergies?.length || 0),
    0
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (onBack) onBack();
            else navigate('/dashboard');
          }}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <FamilyRestroomIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>
            My Family
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage your family members and their dietary needs in one place
        </Typography>
      </Box>

      {/* Info Card */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
        elevation={3}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <ShieldIcon sx={{ fontSize: 40 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Family Mode: Safety for Everyone
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              When you enable Family Mode in chat, the AI will automatically check menu items against
              ALL your family members' allergies. Perfect for dining out with kids!
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats */}
      {!loading && familyMembers.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }} elevation={2}>
              <Typography variant="h4" fontWeight={700} color="primary.main">
                {familyMembers.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Family {familyMembers.length === 1 ? 'Member' : 'Members'}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }} elevation={2}>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {totalAllergies}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total {totalAllergies === 1 ? 'Allergy' : 'Allergies'} Tracked
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

      {/* Add Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingMember(null);
            setDialogOpen(true);
          }}
          sx={{ borderRadius: 2 }}
        >
          Add Family Member
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Family Members Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : familyMembers.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: 'background.default',
            border: '2px dashed',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'center' }}>
            <InfoOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
          </Box>
          <Typography variant="h6" gutterBottom>
            No Family Members Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add your first family member to enable Family Mode and keep everyone safe when dining out.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingMember(null);
              setDialogOpen(true);
            }}
          >
            Add Your First Family Member
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {familyMembers.map((member) => (
            <Grid item xs={12} md={6} key={member.id}>
              <FamilyMemberCard
                member={member}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <AddFamilyMemberDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingMember(null);
        }}
        onSave={editingMember ? handleUpdateMember : handleAddMember}
        initialData={editingMember}
      />
    </Container>
  );
};

export default FamilyManagementScreen;
