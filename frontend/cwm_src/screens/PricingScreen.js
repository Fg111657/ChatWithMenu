import React from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  Container,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CelebrationIcon from '@mui/icons-material/Celebration';

const features = [
  { icon: <MenuBookIcon />, text: 'Digital Menu' },
  { icon: <HealthAndSafetyIcon />, text: 'Allergen Awareness' },
  { icon: <SmartToyIcon />, text: 'Chat bot Management' },
  { icon: <SupportAgentIcon />, text: 'Customer Support' },
];

const PricingScreen = () => {
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: 'calc(100vh - 64px)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Customer Banner */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mb: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0077B6 0%, #023E8A 100%)',
            color: 'white',
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(255,255,255,0.2)',
              mx: 'auto',
              mb: 2,
            }}
          >
            <CelebrationIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Always Free for Customers
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            No hidden fees, no subscriptions. Just better dining experiences.
          </Typography>
        </Paper>

        {/* Restaurant Pricing Card */}
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'secondary.main',
                mx: 'auto',
                mb: 2,
              }}
            >
              <LocalOfferIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={700}>
              Restaurant Pricing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Everything you need to serve customers better
            </Typography>
          </Box>

          <Card
            elevation={0}
            sx={{
              bgcolor: 'grey.50',
              border: '2px solid',
              borderColor: 'primary.main',
              mb: 4,
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      label="BEST VALUE"
                      color="primary"
                      size="small"
                      sx={{ mb: 2, fontWeight: 600 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mr: 0.5 }}>
                        $
                      </Typography>
                      <Typography variant="h2" fontWeight={700} color="primary.main">
                        39.99
                      </Typography>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
                      Per Month
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List dense>
                    {features.map((feature, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.text}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Interested in a demo?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              See how Chat With Menu can transform your restaurant experience
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalendarMonthIcon />}
              onClick={() => window.open('https://calendly.com/chatwithmenu', '_blank')}
              sx={{ px: 4 }}
            >
              Schedule a Meeting
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PricingScreen;
