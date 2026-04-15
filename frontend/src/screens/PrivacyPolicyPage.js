import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * PERSISTENT PRIVACY POLICY PAGE
 * Accessible via footer links and direct URL
 * Version: 1.0.0 (Effective: January 15, 2026)
 */

const PRIVACY_VERSION = '1.0.0';
const EFFECTIVE_DATE = 'January 15, 2026';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
            Chat with Menu
          </Typography>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Last Updated:</strong> {EFFECTIVE_DATE}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ '& h6': { mt: 3, mb: 1, fontWeight: 700 }, '& p': { mb: 2, lineHeight: 1.7 } }}>

          <Typography variant="h6">1. INTRODUCTION</Typography>
          <Typography variant="body2" paragraph>
            This Privacy Policy explains how <strong>Chat with Menu, Inc.</strong> collects, uses, stores, shares, and protects
            your information when you access or use our Service.
          </Typography>
          <Typography variant="body2" paragraph>
            We believe privacy disclosures should be <strong>clear, honest, and easy to understand</strong>. This policy is written
            in plain English so you know exactly what we do—and what we do not do—with your information.
          </Typography>

          <Typography variant="h6">2. WHAT INFORMATION WE COLLECT</Typography>
          <Typography variant="body2" paragraph>
            We collect information in three main ways:
          </Typography>
          <Box component="ol" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Information you provide directly (name, email, dietary preferences, allergies)</Typography></li>
            <li><Typography variant="body2">Information collected automatically (device type, IP address, usage data)</Typography></li>
            <li><Typography variant="body2">Information from third parties (restaurant data, authentication providers)</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>IMPORTANT:</strong> We collect dietary and allergy information <strong>only to provide app functionality</strong>.
            We do <strong>not</strong> verify this information and do <strong>not</strong> treat it as medical data.
          </Typography>

          <Typography variant="h6">3. HOW WE USE YOUR INFORMATION</Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Provide and operate the Service</Typography></li>
            <li><Typography variant="body2">Generate AI-based menu suggestions</Typography></li>
            <li><Typography variant="body2">Improve functionality and user experience</Typography></li>
            <li><Typography variant="body2">Communicate service updates</Typography></li>
            <li><Typography variant="body2">Maintain security</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>We do not use your data to provide medical advice.</strong><br />
            <strong>We do not make health decisions for you.</strong>
          </Typography>

          <Typography variant="h6">4. AI AND AUTOMATED PROCESSING DISCLOSURE</Typography>
          <Typography variant="body2" paragraph>
            The Service uses artificial intelligence. You acknowledge that:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">AI outputs may be inaccurate or incomplete</Typography></li>
            <li><Typography variant="body2">AI may misinterpret user inputs</Typography></li>
            <li><Typography variant="body2">AI responses are <strong>not reviewed by humans in real time</strong></Typography></li>
          </Box>

          <Typography variant="h6">5. HOW WE SHARE INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            We do <strong>not sell</strong> your personal information. We may share information only with:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Service providers (hosting, analytics, authentication)</Typography></li>
            <li><Typography variant="body2">Legal authorities (when required by law)</Typography></li>
            <li><Typography variant="body2">Business transfers (mergers, acquisitions)</Typography></li>
          </Box>

          <Typography variant="h6">6. WHAT WE DO NOT DO</Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">We do <strong>NOT</strong> sell personal data</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> sell dietary or allergy information</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> provide data to advertisers</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> use data for medical profiling</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> guarantee data accuracy</Typography></li>
          </Box>

          <Typography variant="h6">7. DATA SECURITY</Typography>
          <Typography variant="body2" paragraph>
            We use reasonable safeguards to protect your information. However:
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>NO SYSTEM IS 100% SECURE.</strong> We cannot guarantee absolute security. You use the Service{' '}
            <strong>at your own risk</strong>.
          </Typography>

          <Typography variant="h6">8. YOUR RIGHTS AND CHOICES</Typography>
          <Typography variant="body2" paragraph>
            You may have the right to access, correct, or delete your information. Requests can be submitted to:{' '}
            <strong>privacy@chatwithmenu.com</strong>
          </Typography>

          <Typography variant="h6">9. CALIFORNIA PRIVACY RIGHTS (CCPA / CPRA)</Typography>
          <Typography variant="body2" paragraph>
            California residents have additional rights including knowing what information we collect, requesting deletion,
            and opting out of sales (we do not sell). Contact: <strong>privacy@chatwithmenu.com</strong>
          </Typography>

          <Typography variant="h6">10. CHILDREN'S PRIVACY</Typography>
          <Typography variant="body2" paragraph>
            The Service is not intended for children under 13. We do not knowingly collect information from children under 13.
          </Typography>

          <Typography variant="h6">11. CONTACT INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            <strong>Chat with Menu, Inc.</strong><br />
            Privacy Department<br />
            Email: <strong>privacy@chatwithmenu.com</strong>
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, fontStyle: 'italic' }}>
            This is a summary. Please see our complete Privacy Policy for full details.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicyPage;
