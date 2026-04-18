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
  Link,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';

/**
 * TERMS & CONDITIONS MODAL
 * Pre-registration acceptance required for all new accounts
 * Version: 1.0.0 (Effective: January 15, 2026)
 */

const TERMS_VERSION = '1.0.0';
const EFFECTIVE_DATE = 'January 15, 2026';

const TermsAndConditionsModal = ({ open, onClose, onAccept }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [acceptEnabled, setAcceptEnabled] = useState(false);
  const contentRef = useRef(null);

  // Check if user has scrolled to bottom
  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      // Enable accept when user is within 50px of bottom
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;
      if (isNearBottom && !hasScrolled) {
        setHasScrolled(true);
        setAcceptEnabled(true);
      }
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasScrolled(false);
      setAcceptEnabled(false);
    }
  }, [open]);

  const handleAccept = () => {
    const acceptanceData = {
      version: TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
      method: 'modal',
    };
    onAccept(acceptanceData);
  };

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
            Terms of Usage
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
        onScroll={handleScroll}
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
          <strong>Version:</strong> {TERMS_VERSION}
        </Typography>

        {/* TERMS CONTENT */}
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
          <Typography variant="body2" paragraph>
            Restaurants may change their menus, recipes, ingredients, preparation methods, or suppliers without notice to us.
            Cross-contamination may occur in restaurant kitchens. Ingredient sourcing and food preparation practices are beyond our control.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.2 AI Technology Limitations</Typography>
          <Typography variant="body2" paragraph>
            <strong>THE SERVICE USES ARTIFICIAL INTELLIGENCE TECHNOLOGY THAT MAY PRODUCE ERRORS, INACCURACIES, OR "HALLUCINATIONS"
            (GENERATION OF INCORRECT OR FABRICATED INFORMATION).</strong> We cannot guarantee that AI-generated suggestions will
            always be accurate, complete, safe, or appropriate for your specific dietary needs.
          </Typography>
          <Typography variant="body2" paragraph>
            Artificial intelligence systems may misinterpret queries, fail to recognize allergens, overlook ingredient conflicts,
            or provide incomplete information. You must independently verify all recommendations before making dining decisions.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>3.3 User Responsibility for Verification</Typography>
          <Typography variant="body2" paragraph>
            <strong>YOU ARE SOLELY RESPONSIBLE FOR VERIFYING ALL INFORMATION WITH RESTAURANT STAFF BEFORE ORDERING OR CONSUMING
            ANY FOOD OR BEVERAGE.</strong> You must:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Inform restaurant staff directly of all allergies and dietary restrictions</Typography></li>
            <li><Typography variant="body2">Ask detailed questions about ingredients, preparation methods, and cross-contamination risks</Typography></li>
            <li><Typography variant="body2">Request to speak with kitchen management or chefs when necessary</Typography></li>
            <li><Typography variant="body2">Read all ingredient labels and menu descriptions carefully</Typography></li>
            <li><Typography variant="body2">Make your own informed decisions about food safety based on your specific health needs</Typography></li>
          </Box>

          <Typography variant="subtitle2" fontWeight={700}>3.4 Life-Threatening Allergies</Typography>
          <Typography variant="body2" paragraph>
            <strong>IF YOU HAVE SEVERE, LIFE-THREATENING FOOD ALLERGIES (INCLUDING BUT NOT LIMITED TO ANAPHYLAXIS RISK), YOU MUST
            EXERCISE EXTREME CAUTION AND SHOULD NOT RELY ON THE SERVICE AS YOUR PRIMARY MEANS OF IDENTIFYING SAFE FOODS.</strong> Always
            carry appropriate emergency medication (such as epinephrine auto-injectors) and follow your healthcare provider's emergency
            action plan.
          </Typography>

          <Typography variant="h6">4. LIMITATION OF LIABILITY</Typography>

          <Typography variant="subtitle2" fontWeight={700}>4.1 No Liability for Health Consequences</Typography>
          <Typography variant="body2" paragraph>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CHAT WITH MENU, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS,
            AFFILIATES, AND LICENSORS (COLLECTIVELY, "CHAT WITH MENU PARTIES") SHALL NOT BE LIABLE FOR ANY INJURY, ILLNESS, ALLERGIC
            REACTION, ADVERSE HEALTH EFFECT, OR OTHER HARM ARISING FROM OR RELATED TO:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Use of or reliance on the Service</Typography></li>
            <li><Typography variant="body2">Inaccurate, incomplete, or outdated restaurant information</Typography></li>
            <li><Typography variant="body2">AI-generated errors, inaccuracies, or hallucinations</Typography></li>
            <li><Typography variant="body2">Restaurant mistakes in food preparation, ingredient disclosure, or allergen management</Typography></li>
            <li><Typography variant="body2">Cross-contamination or other food safety issues</Typography></li>
            <li><Typography variant="body2">Changes to restaurant menus or recipes</Typography></li>
            <li><Typography variant="body2">Failure to independently verify information with restaurant staff</Typography></li>
          </Box>

          <Typography variant="subtitle2" fontWeight={700}>4.2 Disclaimer of Warranties</Typography>
          <Typography variant="body2" paragraph>
            <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
            INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
            ACCURACY, OR RELIABILITY.</strong> WE DO NOT WARRANT THAT:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">The Service will be uninterrupted, secure, or error-free</Typography></li>
            <li><Typography variant="body2">Information provided will be accurate, complete, current, or reliable</Typography></li>
            <li><Typography variant="body2">AI-generated suggestions will be safe or suitable for your needs</Typography></li>
            <li><Typography variant="body2">Restaurant data will be up-to-date or correctly reflect current offerings</Typography></li>
            <li><Typography variant="body2">Defects will be corrected or that the Service is free of viruses or harmful components</Typography></li>
          </Box>

          <Typography variant="subtitle2" fontWeight={700}>4.3 Maximum Liability Cap</Typography>
          <Typography variant="body2" paragraph>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE TOTAL AGGREGATE LIABILITY OF CHAT WITH MENU PARTIES
            TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF ACTION (WHETHER IN CONTRACT, TORT INCLUDING NEGLIGENCE, WARRANTY, OR OTHERWISE)
            EXCEED THE GREATER OF: (A) THE AMOUNT YOU HAVE PAID TO CHAT WITH MENU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR
            (B) ONE HUNDRED DOLLARS ($100.00).</strong>
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>4.4 Exclusion of Consequential Damages</Typography>
          <Typography variant="body2" paragraph>
            <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CHAT WITH MENU PARTIES BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">Medical expenses, hospitalization costs, or treatment fees</Typography></li>
            <li><Typography variant="body2">Lost wages or loss of employment</Typography></li>
            <li><Typography variant="body2">Pain and suffering or emotional distress</Typography></li>
            <li><Typography variant="body2">Loss of life or permanent injury</Typography></li>
            <li><Typography variant="body2">Property damage</Typography></li>
            <li><Typography variant="body2">Loss of data or profits</Typography></li>
          </Box>
          <Typography variant="body2" paragraph>
            <strong>EVEN IF CHAT WITH MENU HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES OR SUCH DAMAGES WERE REASONABLY FORESEEABLE.</strong>
          </Typography>

          <Typography variant="h6">5. USER RESPONSIBILITIES AND OBLIGATIONS</Typography>

          <Typography variant="body2" paragraph>
            You are responsible for providing accurate, complete, and current information about your dietary restrictions, allergies,
            and preferences. You must promptly update your profile if your dietary needs change. You agree to use the Service only as
            a supplementary tool for restaurant discovery and menu navigation.
          </Typography>

          <Typography variant="h6">6. DATA SOURCES AND ACCURACY</Typography>

          <Typography variant="body2" paragraph>
            Information about restaurants, menus, ingredients, and allergens comes from third-party sources including restaurant-provided
            data, publicly available sources, user-generated content, and third-party APIs. We make reasonable efforts to obtain and display
            accurate information, but we do not independently verify, audit, or guarantee the accuracy of information provided by restaurants
            or other third parties.
          </Typography>

          <Typography variant="h6">7. INDEMNIFICATION</Typography>

          <Typography variant="body2" paragraph>
            You agree to indemnify, defend, and hold harmless Chat with Menu Parties from and against any and all claims, liabilities,
            damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from or relating to your use or misuse
            of the Service, your violation of these Terms, any injury, illness, or adverse health effect you experience, or your failure to
            verify information with restaurants or healthcare providers.
          </Typography>

          <Typography variant="h6">8. DISPUTE RESOLUTION AND ARBITRATION</Typography>

          <Typography variant="subtitle2" fontWeight={700}>8.1 Governing Law</Typography>
          <Typography variant="body2" paragraph>
            These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its
            conflict of law provisions.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>8.2 Mandatory Arbitration</Typography>
          <Typography variant="body2" paragraph>
            Any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be resolved by binding
            arbitration administered by the American Arbitration Association ("AAA") in accordance with its Commercial Arbitration Rules.
            The arbitration shall be conducted in New York, New York, by a single arbitrator. The arbitrator's decision shall be final
            and binding.
          </Typography>

          <Typography variant="subtitle2" fontWeight={700}>8.3 Class Action Waiver</Typography>
          <Typography variant="body2" paragraph>
            <strong>YOU AND CHAT WITH MENU AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY
            AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING.</strong> You agree
            to waive any right to participate in a class action lawsuit or class-wide arbitration.
          </Typography>

          <Typography variant="h6">9. PRIVACY</Typography>

          <Typography variant="body2" paragraph>
            Your use of the Service is also governed by our{' '}
            <Link component={RouterLink} to="/privacy-policy" target="_blank" underline="hover">
              Privacy Policy
            </Link>
            , which is incorporated into these Terms by reference.
          </Typography>

          <Typography variant="h6">10. MODIFICATIONS TO TERMS</Typography>

          <Typography variant="body2" paragraph>
            We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated
            Terms on the Service and updating the "Effective Date." Your continued use of the Service after changes become effective
            constitutes acceptance of the modified Terms.
          </Typography>

          <Typography variant="h6">11. CONTACT INFORMATION</Typography>

          <Typography variant="body2" paragraph>
            If you have questions about these Terms, please contact us at:
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Chat with Menu, Inc.</strong><br />
            Legal Department<br />
            Email: legal@chatwithmenu.com
          </Typography>

          <Typography variant="h6">ACKNOWLEDGMENT OF UNDERSTANDING</Typography>

          <Typography variant="body2" paragraph>
            <strong>BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS.
            YOU SPECIFICALLY ACKNOWLEDGE AND AGREE THAT:</strong>
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li><Typography variant="body2">The Service provides information only and is not medical advice</Typography></li>
            <li><Typography variant="body2">Chat with Menu is not staffed by medical professionals</Typography></li>
            <li><Typography variant="body2">AI technology may produce errors or inaccuracies</Typography></li>
            <li><Typography variant="body2">Restaurant data may be incorrect or outdated</Typography></li>
            <li><Typography variant="body2">You are solely responsible for verifying all information before consuming food</Typography></li>
            <li><Typography variant="body2">You will not rely solely on the Service for allergy or dietary restriction management</Typography></li>
            <li><Typography variant="body2">Chat with Menu is not liable for any health consequences arising from use of the Service</Typography></li>
            <li><Typography variant="body2">You assume all risks associated with using the Service</Typography></li>
          </Box>

        </Box>

        {/* Scroll Indicator */}
        {!hasScrolled && (
          <Box
            sx={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              py: 2,
              background: 'linear-gradient(to top, rgba(255,255,255,1) 50%, rgba(255,255,255,0))',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              ↓ Please scroll to read all terms ↓
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2, flexDirection: 'column', alignItems: 'stretch' }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleAccept}
          disabled={!acceptEnabled}
          sx={{ mb: 1 }}
        >
          I agree with Chat with Menu Terms & Conditions
        </Button>
        <Button
          variant="text"
          size="small"
          onClick={onClose}
          sx={{ color: 'text.secondary' }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsAndConditionsModal;
