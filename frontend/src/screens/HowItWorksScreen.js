import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Container,
  Avatar,
  Paper,
} from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ExploreIcon from '@mui/icons-material/Explore';
import StorefrontIcon from '@mui/icons-material/Storefront';

const steps = [
  {
    icon: <QrCodeScannerIcon fontSize="large" />,
    title: 'Scan & Connect',
    description: 'Pick a restaurant online or scan the QR Code on the menu',
  },
  {
    icon: <ChatIcon fontSize="large" />,
    title: 'Share Preferences',
    description: 'Inform our Chat bot of any restrictions you may have',
  },
  {
    icon: <CheckCircleIcon fontSize="large" />,
    title: 'Get Recommendations',
    description: 'Get a recommendation in under 60 seconds and order away',
  },
];

const cities = [
  { city: 'New York', image: 'howitworks/nyc.webp' },
  { city: 'San Francisco', image: 'howitworks/sfo.webp' },
  { city: 'Chicago', image: 'howitworks/chi.webp' },
];

const restaurants = [
  { name: 'Il Violino', image: 'howitworks/rest_ilv.webp' },
  { name: 'Chipotle', image: 'howitworks/rest_chip.webp' },
  { name: 'Carrot Express', image: 'howitworks/rest_carr.webp' },
];

const HowItWorksScreen = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
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
            <RestaurantIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" fontWeight={700}>
            How It Works
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Three simple steps to personalized dining
          </Typography>
        </Box>

        {/* Steps */}
        <Grid container spacing={4} justifyContent="center">
          {steps.map((step, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Card
                elevation={0}
                sx={{
                  textAlign: 'center',
                  bgcolor: 'transparent',
                  height: '100%',
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-block',
                      mb: 2,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 72,
                        height: 72,
                      }}
                    >
                      {step.icon}
                    </Avatar>
                    <Avatar
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 28,
                        height: 28,
                        bgcolor: 'secondary.main',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </Avatar>
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Discover Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <ExploreIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Discover Cities
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {cities.map(({ city, image }) => (
            <Grid item xs={12} sm={4} key={city}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  alt={city}
                  height="160"
                  image={image}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {city}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Popular Restaurants Section */}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <StorefrontIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Popular Restaurants Near You
          </Typography>
        </Box>
        <Grid container spacing={3}>
          {restaurants.map(({ name, image }) => (
            <Grid item xs={12} sm={4} key={name}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardMedia
                  component="img"
                  alt={name}
                  height="160"
                  image={image}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default HowItWorksScreen;
