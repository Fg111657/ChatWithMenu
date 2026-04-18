import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CartProvider } from './contexts/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './UserContext';
import LoginScreen from './screens/LoginScreen';
import CreateAccountScreen from './screens/CreateAccountScreen';
import AboutScreen from './screens/AboutScreen';
import LandingScreen from './screens/LandingScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';
import ModifyPreferencesScreen from './screens/ModifyPreferencesScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AddRestaurantScreen from './screens/AddRestaurantScreen';
import HowItWorksScreen from './screens/HowItWorksScreen';
import PricingScreen from './screens/PricingScreen';
import ServerDashboardScreen from './screens/ServerDashboardScreen';
import MenuManagerScreen from './screens/MenuManagerScreen';
import RestaurantDiscoveryScreen from './screens/RestaurantDiscoveryScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderStatusScreen from './screens/OrderStatusScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import FamilyManagementScreen from './screens/FamilyManagementScreen';
import MyTableScreen from './screens/MyTableScreen';
import TableQuestionsScreen from './screens/TableQuestionsScreen';
import SafetySignalsScreen from './screens/SafetySignalsScreen';
import TermsPage from './screens/TermsPage';
import PrivacyPolicyPage from './screens/PrivacyPolicyPage';
import Layout from './NavBarLayout';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const App = () => {
  return (
    <ErrorBoundary>
      <UserProvider>
        <CartProvider>
          <Elements stripe={stripePromise}>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="/create-account" element={<CreateAccountScreen />} />
                  <Route path="/about" element={<AboutScreen />} />
                  <Route path="/" element={<LandingScreen />} />
                  <Route path="/dashboard" element={<DashboardScreen />} />
                  <Route path="/chat" element={<ChatScreen />} />
                  <Route path="/modify-preferences" element={<ModifyPreferencesScreen />} />
                  <Route path="/edit-profile" element={<EditProfileScreen />} />
                  <Route path="/add-restaurant" element={<AddRestaurantScreen />} />
                  <Route path="/how-it-works" element={<HowItWorksScreen />} />
                  <Route path="/pricing" element={<PricingScreen />} />
                  <Route path="/server-dashboard" element={<ServerDashboardScreen />} />
                  <Route path="/menu-manager" element={<MenuManagerScreen />} />
                  <Route path="/family-management" element={<FamilyManagementScreen />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/my-table" element={<MyTableScreen />} />
                  <Route path="/table-questions" element={<TableQuestionsScreen />} />
                  <Route path="/safety-signals" element={<SafetySignalsScreen />} />
                  <Route path="/discover" element={<RestaurantDiscoveryScreen />} />
                  <Route path="/checkout" element={<CheckoutScreen />} />
                  <Route path="/order-status/:orderId" element={<OrderStatusScreen />} />
                  <Route path="/order-history" element={<OrderHistoryScreen />} />
                </Routes>
              </Layout>
            </Router>
          </Elements>
        </CartProvider>
      </UserProvider>
    </ErrorBoundary>
  );
};

export default App;
