import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * PRIVACY POLICY MODAL
 * Can be displayed standalone or alongside Terms
 * Version: 1.0.0 (Effective: January 15, 2026)
 */

const PRIVACY_VERSION = '1.0.0';
const EFFECTIVE_DATE = 'January 15, 2026';

const PrivacyPolicyModal = ({ open, onClose }) => {
  const contentRef = useRef(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary">
            Chat with Menu
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Privacy Policy
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* Scrollable Content */}
      <DialogContent
        ref={contentRef}
        sx={{
          px: 3,
          py: 2,
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <strong>Effective Date:</strong> {EFFECTIVE_DATE}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
          <strong>Last Updated:</strong> {EFFECTIVE_DATE}
        </Typography>

        {/* PRIVACY POLICY CONTENT */}
        <Box sx={{ '& h6': { mt: 3, mb: 1, fontWeight: 700 }, '& p': { mb: 2, lineHeight: 1.7 } }}>

          <Typography variant="h6">1. INTRODUCTION</Typography>
          <Typography variant="body2" paragraph>
            This Privacy Policy explains how <strong>Chat with Menu, Inc.</strong> ("Chat with Menu," "we," "us," or "our")
            collects, uses, stores, shares, and protects your information when you access or use our website, mobile application,
            and related services (collectively, the <strong>"Service"</strong>).
          </Typography>
          <Typography variant="body2" paragraph>
            We believe privacy disclosures should be <strong>clear, honest, and easy to understand</strong>. This policy is written
            in plain English so you know exactly what we do—and what we do not do—with your information.
          </Typography>
          <Typography variant="body2" paragraph>
            By using the Service, you agree to the collection and use of information as described in this Privacy Policy.
          </Typography>

          <Typography variant="h6">2. WHAT INFORMATION WE COLLECT</Typography>
          <Typography variant="body2" paragraph>
            We collect information in three main ways:
          </Typography>
          <Box component="ol" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Information you provide directly</Typography></li>
            <li><Typography variant="body2">Information collected automatically</Typography></li>
            <li><Typography variant="body2">Information received from third parties</Typography></li>
          </Box>

          <Typography variant="subtitle2" fontWeight={700}>2.1 Information You Provide Directly</Typography>
          <Typography variant="body2" paragraph>
            You may provide us with information when you create an account, use the Service, communicate with us, or update your profile.
            This may include:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Name</Typography></li>
            <li><Typography variant="body2">Email address</Typography></li>
            <li><Typography variant="body2">Account login credentials</Typography></li>
            <li><Typography variant="body2">Dietary preferences and restrictions</Typography></li>
            <li><Typography variant="body2">Allergy information (as entered by you)</Typography></li>
            <li><Typography variant="body2">Location (city or general area)</Typography></li>
            <li><Typography variant="body2">Feedback or messages you send us</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>IMPORTANT:</strong> We collect dietary and allergy information <strong>only to provide app functionality</strong>.
            We do <strong>not</strong> verify this information and do <strong>not</strong> treat it as medical data.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.2 Information Collected Automatically</Typography>
          <Typography variant="body2" paragraph>
            When you use the Service, we automatically collect certain technical information, including:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Device type</Typography></li>
            <li><Typography variant="body2">Browser type</Typography></li>
            <li><Typography variant="body2">Operating system</Typography></li>
            <li><Typography variant="body2">IP address</Typography></li>
            <li><Typography variant="body2">App usage data (pages viewed, features used)</Typography></li>
            <li><Typography variant="body2">Date and time of access</Typography></li>
            <li><Typography variant="body2">Log files and diagnostic data</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            This information helps us improve performance, fix bugs, maintain security, and understand how the Service is used.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.3 Information From Third Parties</Typography>
          <Typography variant="body2" paragraph>
            We may receive information from:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Restaurant partners</Typography></li>
            <li><Typography variant="body2">Publicly available sources (menus, restaurant websites)</Typography></li>
            <li><Typography variant="body2">Third-party APIs and data providers</Typography></li>
            <li><Typography variant="body2">Authentication providers (e.g., Google login)</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            We do <strong>not</strong> control the accuracy of third-party data and are <strong>not responsible</strong> for errors
            or omissions in such data.
          </Typography>

          <Typography variant="h6">3. HOW WE USE YOUR INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            We use your information to:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Provide and operate the Service</Typography></li>
            <li><Typography variant="body2">Create and manage your account</Typography></li>
            <li><Typography variant="body2">Generate AI-based menu suggestions</Typography></li>
            <li><Typography variant="body2">Display restaurant and menu information</Typography></li>
            <li><Typography variant="body2">Improve functionality and user experience</Typography></li>
            <li><Typography variant="body2">Communicate service updates</Typography></li>
            <li><Typography variant="body2">Respond to support requests</Typography></li>
            <li><Typography variant="body2">Maintain security and prevent misuse</Typography></li>
            <li><Typography variant="body2">Comply with legal obligations</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>We do not use your data to provide medical advice.</strong><br />
            <strong>We do not make health decisions for you.</strong>
          </Typography>

          <Typography variant="h6">4. AI AND AUTOMATED PROCESSING DISCLOSURE</Typography>
          <Typography variant="body2" paragraph>
            The Service uses artificial intelligence to analyze menu data and user inputs.
          </Typography>
          <Typography variant="subtitle2" fontWeight={700}>You acknowledge that:</Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">AI outputs may be inaccurate or incomplete</Typography></li>
            <li><Typography variant="body2">AI may misinterpret user inputs</Typography></li>
            <li><Typography variant="body2">AI may produce incorrect or outdated information</Typography></li>
            <li><Typography variant="body2">AI responses are <strong>not reviewed by humans in real time</strong></Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            AI-generated outputs are provided <strong>for informational purposes only</strong> and should always be independently verified.
          </Typography>

          <Typography variant="h6">5. HOW WE SHARE INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            We do <strong>not sell</strong> your personal information.
          </Typography>
          <Typography variant="body2" paragraph>
            We may share information only in the following limited circumstances:
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>5.1 Service Providers</Typography>
          <Typography variant="body2" paragraph>
            We share data with trusted vendors who help us host infrastructure, provide analytics, process authentication, and maintain
            security. These providers are contractually required to protect your data.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>5.2 Legal Requirements</Typography>
          <Typography variant="body2" paragraph>
            We may disclose information if required to comply with law or legal process, respond to lawful government requests, protect
            our legal rights, enforce our Terms and Conditions, or prevent fraud or security threats.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>5.3 Business Transfers</Typography>
          <Typography variant="body2" paragraph>
            If we are involved in a merger, acquisition, or asset sale, user information may be transferred as part of that transaction.
          </Typography>

          <Typography variant="h6">6. WHAT WE DO NOT DO</Typography>
          <Typography variant="body2" paragraph>
            To be absolutely clear:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">We do <strong>NOT</strong> sell personal data</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> sell dietary or allergy information</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> provide data to advertisers</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> use data for medical profiling</Typography></li>
            <li><Typography variant="body2">We do <strong>NOT</strong> guarantee data accuracy</Typography></li>
          </Box>

          <Typography variant="h6">7. DATA RETENTION</Typography>
          <Typography variant="body2" paragraph>
            We retain your information for as long as your account is active, as needed to provide the Service, as required to comply
            with legal obligations, and to resolve disputes and enforce agreements.
          </Typography>
          <Typography variant="body2" paragraph>
            You may request account deletion at any time, subject to legal retention requirements.
          </Typography>

          <Typography variant="h6">8. DATA SECURITY</Typography>
          <Typography variant="body2" paragraph>
            We use reasonable administrative, technical, and organizational safeguards to protect your information.
          </Typography>
          <Typography variant="body2" paragraph>
            However:
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>NO SYSTEM IS 100% SECURE.</strong> We cannot guarantee absolute security of your data. You use the Service{' '}
            <strong>at your own risk</strong>.
          </Typography>

          <Typography variant="h6">9. YOUR RIGHTS AND CHOICES</Typography>
          <Typography variant="body2" paragraph>
            Depending on your location, you may have the right to:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Access your information</Typography></li>
            <li><Typography variant="body2">Correct inaccurate information</Typography></li>
            <li><Typography variant="body2">Request deletion</Typography></li>
            <li><Typography variant="body2">Object to certain processing</Typography></li>
            <li><Typography variant="body2">Withdraw consent</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            Requests can be submitted to: <strong>privacy@chatwithmenu.com</strong>
          </Typography>
          <Typography variant="body2" paragraph>
            We may need to verify your identity before fulfilling requests.
          </Typography>

          <Typography variant="h6">10. CALIFORNIA PRIVACY RIGHTS (CCPA / CPRA)</Typography>
          <Typography variant="body2" paragraph>
            If you are a California resident, you have the right to:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Know what personal information we collect</Typography></li>
            <li><Typography variant="body2">Request deletion of personal information</Typography></li>
            <li><Typography variant="body2">Opt out of the sale of personal information (we do not sell)</Typography></li>
            <li><Typography variant="body2">Be free from discrimination for exercising privacy rights</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            To exercise your rights, email: <strong>privacy@chatwithmenu.com</strong>
          </Typography>

          <Typography variant="h6">11. CHILDREN'S PRIVACY</Typography>
          <Typography variant="body2" paragraph>
            The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            If we learn that we have done so, we will delete it promptly.
          </Typography>

          <Typography variant="h6">12. INTERNATIONAL USERS</Typography>
          <Typography variant="body2" paragraph>
            If you access the Service from outside the United States, you understand and agree that your information will be processed
            and stored in the United States, where data protection laws may differ from your jurisdiction.
          </Typography>

          <Typography variant="h6">13. CHANGES TO THIS PRIVACY POLICY</Typography>
          <Typography variant="body2" paragraph>
            We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date and post material
            changes clearly. Continued use of the Service after changes means you accept the updated policy.
          </Typography>

          <Typography variant="h6">14. CONTACT INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            If you have questions or concerns about this Privacy Policy, contact us at:
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Chat with Menu, Inc.</strong><br />
            Privacy Department<br />
            Email: <strong>privacy@chatwithmenu.com</strong>
          </Typography>

          <Typography variant="h6">ACKNOWLEDGMENT</Typography>
          <Typography variant="body2" paragraph>
            By using Chat with Menu, you acknowledge that:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">You have read this Privacy Policy</Typography></li>
            <li><Typography variant="body2">You understand how your information is handled</Typography></li>
            <li><Typography variant="body2">You accept the risks described</Typography></li>
            <li><Typography variant="body2">You agree to the collection and use of data as outlined</Typography></li>
          </Box>

        </Box>
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" fullWidth onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivacyPolicyModal;
