import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Snackbar,
  Alert,
  Avatar,
  Stack,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ArticleIcon from '@mui/icons-material/Article';
import dataService from '../services/dataService';

function AddRestaurantScreen() {
  const [restaurantName, setRestaurantName] = useState('');
  const [menus, setMenus] = useState([{ menu_data: '' }]);
  const [documents, setDocuments] = useState([{ document_type: 'Ingredients', document_data: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await dataService.createRestaurant({
        restaurant: { name: restaurantName },
        menus,
        documents,
      });
      setSuccess('Restaurant saved successfully!');
      setSaving(false);
    } catch (error) {
      console.error(error);
      setError('Failed to save restaurant: ' + error);
      setSaving(false);
    }
  };

  const updateMenu = (index, value) => {
    setMenus(menus.map((item, idx) => (idx === index ? { ...item, menu_data: value } : item)));
  };

  const updateDocument = (index, field, value) => {
    setDocuments(
      documents.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'primary.main',
              mx: 'auto',
              mb: 2,
            }}
          >
            <StorefrontIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>
            Add New Restaurant
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter restaurant details, menus, and supporting documents
          </Typography>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Restaurant Info Section */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <StorefrontIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Restaurant Information
            </Typography>
          </Box>
          <TextField
            label="Restaurant Name"
            fullWidth
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <RestaurantMenuIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Menus Section */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <MenuBookIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Menus
            </Typography>
          </Box>

          <Stack spacing={2}>
            {menus.map((menu, menuIdx) => (
              <Card key={menuIdx} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <TextField
                      label={`Menu ${menuIdx + 1}`}
                      fullWidth
                      value={menu.menu_data}
                      multiline
                      rows={4}
                      onChange={(e) => updateMenu(menuIdx, e.target.value)}
                      placeholder="Enter menu items, descriptions, and prices..."
                    />
                    <IconButton
                      onClick={() => setMenus(menus.filter((_, idx) => idx !== menuIdx))}
                      color="error"
                      disabled={menus.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setMenus([...menus, { menu_data: '' }])}
              fullWidth
            >
              Add Menu
            </Button>
          </Stack>
        </Paper>

        {/* Documents Section */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <DescriptionIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Documents
            </Typography>
          </Box>

          <Stack spacing={2}>
            {documents.map((document, docIdx) => (
              <Card key={docIdx} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        label="Document Type"
                        fullWidth
                        value={document.document_type}
                        onChange={(e) => updateDocument(docIdx, 'document_type', e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <ArticleIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      <IconButton
                        onClick={() => setDocuments(documents.filter((_, idx) => idx !== docIdx))}
                        color="error"
                        disabled={documents.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    <TextField
                      label="Document Data"
                      fullWidth
                      value={document.document_data}
                      multiline
                      rows={4}
                      onChange={(e) => updateDocument(docIdx, 'document_data', e.target.value)}
                      placeholder="Enter ingredient lists, allergen info, etc..."
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setDocuments([...documents, { document_type: '', document_data: '' }])}
              fullWidth
            >
              Add Document
            </Button>
          </Stack>
        </Paper>

        {/* Save Button */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={save}
            disabled={saving || !restaurantName}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {saving ? 'Saving Restaurant...' : 'Save Restaurant'}
          </Button>
        </Paper>
      </Stack>

      {/* Success Snackbar */}
      <Snackbar
        open={success !== null}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AddRestaurantScreen;
