import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Stack,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SecurityIcon from '@mui/icons-material/Security';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';

const aboutSections = [
  {
    icon: <SmartToyIcon />,
    title: 'AI-Powered Assistance',
    content:
      'Chat With Menu is an AI-powered chatbot that helps people with dietary needs find suitable menu options when dining out. Simply scan a QR code on the menu to access the chatbot. Enter any dietary restrictions, and it will suggest personalized recommendations after cross-referencing the ingredients.',
  },
  {
    icon: <SecurityIcon />,
    title: 'Enhanced Safety',
    content:
      'The chatbot eliminates reliance on servers to remember every ingredient and prep method. It also provides allergen and nutrition information in-app. This improves safety for people with food allergies or intolerances.',
  },
  {
    icon: <IntegrationInstructionsIcon />,
    title: 'Seamless Integration',
    content:
      'For restaurants, Chat With Menu seamlessly integrates as an affordable add-on to existing tech stacks. It reduces workload for staff while enhancing guest satisfaction. The chatbot is accessible on web, mobile, and in multiple languages.',
  },
  {
    icon: <GroupsIcon />,
    title: 'Our Team',
    content:
      'Our founding team combines expertise in AI, restaurant operations, nutrition, and marketing. We share a passion for leveraging technology to remove dining limitations for millions of underserved customers. Chat With Menu is just the start of the inclusive solutions we aim to build.',
  },
  {
    icon: <BusinessIcon />,
    title: 'Business Model',
    content:
      'The business model focuses on recurring SaaS subscription revenue from restaurants. There are also transaction fees based on customer usage. We provide customized enterprise solutions for large chains as well. The chatbot will ultimately pay for itself by driving guest loyalty and engagement.',
  },
];

function AboutScreen() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        {/* Header */}
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
            <InfoIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" fontWeight={700}>
            About Chat With Menu
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Making dining accessible for everyone
          </Typography>
        </Box>
      </Paper>

      {/* Content Sections */}
      <Stack spacing={3}>
        {aboutSections.map((section, index) => (
          <Card key={index} elevation={2}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: index % 2 === 0 ? 'primary.light' : 'secondary.light',
                    color: index % 2 === 0 ? 'primary.dark' : 'secondary.dark',
                  }}
                >
                  {section.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {section.content}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Stats Section */}
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" fontWeight={600} textAlign="center" gutterBottom>
          Why Choose Us
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {[
            { value: '60s', label: 'Average Response Time' },
            { value: '100+', label: 'Partner Restaurants' },
            { value: '24/7', label: 'Availability' },
          ].map((stat, index) => (
            <Grid item xs={12} sm={4} key={index}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" fontWeight={700} color="primary.main">
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
}

export default AboutScreen;
