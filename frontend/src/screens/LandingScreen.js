import React from 'react';
import { Container, Box, Typography, Button, Stack, Fade } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

function LandingScreen() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        flexGrow: 1,
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(135deg, rgba(0,119,182,0.85), rgba(255,107,53,0.75)), url(/landing.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)',
          textAlign: 'center',
          py: 4,
        }}
      >
        <Fade in timeout={800}>
          <Box>
            <img src="/assets/logos/cwm-variant-03.png" alt="Chat With Menu Logo" style={{ height: '360px', width: 'auto', display: 'block', margin: '0 auto' }} />
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                color: 'white',
                fontWeight: 700,
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                mb: 2,
              }}
            >
              Never stress about what to eat
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                mb: 4,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              AI-powered menu recommendations tailored to your preferences and dietary needs
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'grey.100',
                    transform: 'scale(1.02)',
                  },
                  transition: 'transform 0.2s',
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/how-it-works')}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                Learn More
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}

export default LandingScreen;
