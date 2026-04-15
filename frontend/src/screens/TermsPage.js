import React from 'react';
import { Container, Paper, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

/**
 * PERSISTENT TERMS & CONDITIONS PAGE
 * Accessible via footer links and direct URL
 * Version: 1.0.0 (Effective: January 15, 2026)
 */

const TERMS_VERSION = '1.0.0';
const EFFECTIVE_DATE = 'January 15, 2026';

const TermsPage = () => {
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
            Terms and Conditions of Use
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Effective Date:</strong> {EFFECTIVE_DATE}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Version:</strong> {TERMS_VERSION}
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ '& h6': { mt: 3, mb: 1, fontWeight: 700 }, '& p': { mb: 2, lineHeight: 1.7 } }}>

          <Typography variant="h6">1. ACCEPTANCE OF TERMS</Typography>
          <Typography variant="body2" paragraph>
            These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("you," "your," or "User")
            and Chat with Menu, Inc. ("Chat with Menu," "we," "us," or "our") governing your access to and use of the Chat
            with Menu mobile application, website, and related services (collectively, the "Service").
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>1.1 Binding Agreement</Typography>
          <Typography variant="body2" paragraph>
            <strong>BY CLICKING "I AGREE WITH CHAT WITH MENU TERMS & CONDITIONS," BY CHECKING THE ACCEPTANCE BOX, BY CREATING
            AN ACCOUNT, OR BY ACCESSING OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE
            BOUND BY THESE TERMS.</strong> Your electronic acceptance constitutes your signature and agreement to be legally bound
            by these Terms as if you had physically signed a written agreement.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>1.2 No Account Without Acceptance</Typography>
          <Typography variant="body2" paragraph>
            <strong>YOU CANNOT AND WILL NOT BE PERMITTED TO CREATE AN ACCOUNT OR USE THE SERVICE WITHOUT FIRST ACCEPTING THESE TERMS.</strong>
            If you do not agree to these Terms in their entirety, you must immediately cease all use of the Service and may not create an account.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>1.3 Capacity to Agree</Typography>
          <Typography variant="body2" paragraph>
            By accepting these Terms, you represent and warrant that you have the legal capacity to enter into a binding agreement.
            If you do not have such capacity, you must not use the Service.
          </Typography>

          <Typography variant="h6">2. PURPOSE AND INTENDED USE OF THE SERVICE</Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.1 Service Description</Typography>
          <Typography variant="body2" paragraph>
            Chat with Menu is a restaurant discovery and menu navigation platform that uses artificial intelligence to provide dining
            suggestions based on user-provided dietary preferences, restrictions, and allergies. The Service is designed to help users
            identify potentially suitable dining options and menu items.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.2 Information Only - Not Medical Advice</Typography>
          <Typography variant="body2" paragraph>
            <strong>THE SERVICE PROVIDES INFORMATIONAL SUGGESTIONS ONLY AND IS NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL, NUTRITIONAL,
            OR DIETARY ADVICE.</strong> Chat with Menu is not staffed by medical professionals, dietitians, or nutritionists. All
            recommendations, suggestions, and information provided through the Service are based solely on publicly available data and
            user-provided information.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.3 No Medical Recommendations</Typography>
          <Typography variant="body2" paragraph>
            <strong>WE DO NOT PROVIDE MEDICAL ADVICE, DIAGNOSES, OR TREATMENT RECOMMENDATIONS.</strong> The Service does not replace
            consultation with qualified healthcare providers, allergists, or registered dietitians. You should always consult with your
            physician or other qualified healthcare provider regarding any medical condition, food allergy, or dietary restriction.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>2.4 Suggestions Made in Good Faith</Typography>
          <Typography variant="body2" paragraph>
            All suggestions, recommendations, and information provided through the Service are offered in good faith based solely on
            the data available to us at the time of your request. We make our best efforts to provide helpful information; however:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">We cannot and do not guarantee the accuracy, completeness, reliability, or suitability of any information</Typography></li>
            <li><Typography variant="body2">We do not independently verify restaurant-provided data</Typography></li>
            <li><Typography variant="body2">We cannot control when restaurants change menus, recipes, or ingredients</Typography></li>
            <li><Typography variant="body2">We cannot guarantee our AI will correctly interpret your needs or restaurant data</Typography></li>
            <li><Typography variant="body2">We provide this Service as an informational tool only, not as professional advice</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>OUR GOOD FAITH EFFORTS DO NOT CREATE ANY WARRANTY, GUARANTEE, OR LIABILITY FOR THE ACCURACY OR SAFETY OF
            INFORMATION PROVIDED.</strong>
          </Typography>

          <Typography variant="h6">3. CRITICAL DISCLAIMERS AND LIMITATIONS OF LIABILITY</Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.1 Restaurant Data Disclaimer</Typography>
          <Typography variant="body2" paragraph>
            <strong>RESTAURANT MENU INFORMATION, INGREDIENT LISTS, ALLERGEN DATA, AND OTHER DETAILS ARE PROVIDED BY THIRD-PARTY
            RESTAURANT PARTNERS OR OBTAINED FROM PUBLICLY AVAILABLE SOURCES. WE ARE NOT RESPONSIBLE FOR AND CANNOT VERIFY THE
            ACCURACY, COMPLETENESS, OR CURRENTNESS OF THIS INFORMATION.</strong>
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.2 AI Technology Limitations</Typography>
          <Typography variant="body2" paragraph>
            <strong>THE SERVICE USES ARTIFICIAL INTELLIGENCE TECHNOLOGY THAT MAY PRODUCE ERRORS, INACCURACIES, OR "HALLUCINATIONS"
            (GENERATION OF INCORRECT OR FABRICATED INFORMATION).</strong> We cannot guarantee that AI-generated suggestions will
            always be accurate, complete, safe, or appropriate for your specific dietary needs.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.3 User Responsibility for Verification</Typography>
          <Typography variant="body2" paragraph>
            <strong>YOU ARE SOLELY RESPONSIBLE FOR VERIFYING ALL INFORMATION WITH RESTAURANT STAFF BEFORE ORDERING OR CONSUMING
            ANY FOOD OR BEVERAGE.</strong>
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.4 Life-Threatening Allergies</Typography>
          <Typography variant="body2" paragraph>
            <strong>IF YOU HAVE SEVERE, LIFE-THREATENING FOOD ALLERGIES (INCLUDING BUT NOT LIMITED TO ANAPHYLAXIS RISK), YOU MUST
            EXERCISE EXTREME CAUTION AND SHOULD NOT RELY ON THE SERVICE AS YOUR PRIMARY MEANS OF IDENTIFYING SAFE FOODS.</strong>
          </Typography>

          <Typography variant="h6">4. LIMITATION OF LIABILITY</Typography>
          <Typography variant="body2" paragraph>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CHAT WITH MENU PARTIES SHALL NOT BE LIABLE FOR ANY INJURY,
            ILLNESS, ALLERGIC REACTION, ADVERSE HEALTH EFFECT, OR OTHER HARM ARISING FROM OR RELATED TO USE OF THE SERVICE.</strong>
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.</strong>
          </Typography>

          <Typography variant="h6">5. DISPUTE RESOLUTION AND ARBITRATION</Typography>
          <Typography variant="body2" paragraph>
            These Terms shall be governed by the laws of the State of New York. Any dispute shall be resolved by binding arbitration
            administered by the American Arbitration Association.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>YOU AND CHAT WITH MENU AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY
            AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING.</strong>
          </Typography>

          <Typography variant="h6">CONTACT INFORMATION</Typography>
          <Typography variant="body2" paragraph>
            <strong>Chat with Menu, Inc.</strong><br />
            Legal Department<br />
            Email: legal@chatwithmenu.com
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 4, fontStyle: 'italic' }}>
            This is a summary. Please see the full Terms & Conditions accepted during registration for complete legal details.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsPage;
