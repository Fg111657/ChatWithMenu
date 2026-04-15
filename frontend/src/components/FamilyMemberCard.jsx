import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';

// Get severity color for allergies
const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

// Get relationship icon
const getRelationshipIcon = (relationship) => {
  switch (relationship?.toLowerCase()) {
    case 'child':
      return <ChildCareIcon />;
    case 'teen':
      return <PersonIcon />;
    default:
      return <PersonIcon />;
  }
};

// Get avatar background color based on name
const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const FamilyMemberCard = ({ member, onEdit, onDelete }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    onDelete(member.id);
  };

  const hasAllergies = member.allergies && member.allergies.length > 0;
  const hasHighSeverityAllergies = hasAllergies &&
    member.allergies.some((a) => a.severity?.toLowerCase() === 'high');

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          transition: 'all 0.3s ease',
          borderLeft: hasHighSeverityAllergies ? '4px solid' : 'none',
          borderLeftColor: 'error.main',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
        elevation={2}
      >
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: getAvatarColor(member.name),
                fontSize: '1.5rem',
                fontWeight: 700,
                mr: 2,
              }}
            >
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                member.name?.charAt(0).toUpperCase()
              )}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {member.name}
                </Typography>
                {hasHighSeverityAllergies && (
                  <Tooltip title="Has severe allergies">
                    <ShieldIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {member.age && (
                  <Chip
                    size="small"
                    label={`Age ${member.age}`}
                    variant="outlined"
                    icon={getRelationshipIcon(member.relationship)}
                  />
                )}
                {member.relationship && (
                  <Typography variant="caption" color="text.secondary">
                    {member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box>
              <Tooltip title="Edit">
                <IconButton
                  size="small"
                  onClick={() => onEdit(member)}
                  sx={{ color: 'primary.main' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  onClick={handleDeleteClick}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Allergies */}
          {hasAllergies ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <WarningAmberIcon fontSize="small" color="warning" />
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Allergies & Restrictions
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {member.allergies.map((allergy) => (
                  <Chip
                    key={allergy.id}
                    label={allergy.ingredient}
                    size="small"
                    color={getSeverityColor(allergy.severity)}
                    variant="filled"
                    sx={{
                      fontWeight: allergy.severity?.toLowerCase() === 'high' ? 600 : 400,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : (
            <Box
              sx={{
                textAlign: 'center',
                py: 2,
                bgcolor: 'success.lighter',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'success.main',
              }}
            >
              <Typography variant="body2" color="success.dark">
                No allergies or restrictions 🎉
              </Typography>
            </Box>
          )}

          {/* Emergency Contact */}
          {member.emergency_contact && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Emergency Contact
              </Typography>
              <Typography variant="body2">
                {typeof member.emergency_contact === 'string'
                  ? member.emergency_contact
                  : JSON.parse(member.emergency_contact).name || member.emergency_contact}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove Family Member?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{member.name}</strong> from your family
            profile? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FamilyMemberCard;
