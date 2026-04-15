import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../contexts/CartContext';
import dataService from '../services/dataService';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

function CheckoutScreen() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { cartItems, restaurantId, orderId, setOrderId, clearCart, getTotal } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [tipPercent, setTipPercent] = useState(15);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const { subtotal, tax } = getTotal();
  const deliveryFee = deliveryMethod === 'delivery' ? 500 : 0; // $5.00 in cents

  const tipAmount = tipPercent === 'custom'
    ? Math.round(parseFloat(customTip || 0) * 100)
    : Math.round(subtotal * (tipPercent / 100));

  const total = subtotal + tax + deliveryFee + tipAmount;

  useEffect(() => {
    // Redirect if cart is empty
    if (cartItems.length === 0) {
      navigate('/chat');
    }
  }, [cartItems, navigate]);

  const formatPrice = (cents) => {
  // FIX_06: orders/payments backend not yet implemented
  if (true) {
    return (
      <div style={{padding:'2rem',textAlign:'center'}}>
        <h2>Order & Pay</h2>
        <p style={{color:'#666',marginTop:'1rem'}}>Online ordering is coming soon! Please order with your server.</p>
      </div>
    );
  }
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);
    setPaymentError(null);

    try {
      // Step 1: Create order on backend if not already created
      let currentOrderId = orderId;

      if (!currentOrderId) {
        const orderData = {
          restaurant_id: restaurantId,
          delivery_method: deliveryMethod,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          delivery_address: deliveryMethod === 'delivery' ? deliveryAddress : null,
          special_instructions: specialInstructions || null,
          tip_cents: tipAmount
        };

        const newOrder = await dataService.createOrder(orderData);
        currentOrderId = newOrder.id;
        setOrderId(currentOrderId);

        // Add all cart items to the order
        for (const item of cartItems) {
          await dataService.addOrderItem(currentOrderId, {
            menu_item_id: item.menu_item_id,
            item_name: item.item_name,
            item_description: item.item_description || null,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            customizations: item.customizations || null,
            special_requests: item.special_requests || null
          });
        }
      }

      // Step 2: Create payment intent
      const paymentIntentResponse = await dataService.createPaymentIntent({
        order_id: currentOrderId
      });

      const { client_secret, payment_id } = paymentIntentResponse;

      // Step 3: Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
            },
          },
        }
      );

      if (stripeError) {
        setPaymentError(stripeError.message);
        setLoading(false);
        return;
      }

      // Step 4: Confirm payment on backend
      if (paymentIntent.status === 'succeeded') {
        await dataService.confirmPayment(payment_id, {
          stripe_payment_intent_id: paymentIntent.id
        });

        // Step 5: Submit order
        await dataService.submitOrder(currentOrderId);

        // Clear cart and navigate to order status
        clearCart();
        navigate(`/order-status/${currentOrderId}`);
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to process order. Please try again.');
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (!customerName || !customerPhone || !customerEmail) return false;
    if (deliveryMethod === 'delivery' && !deliveryAddress) return false;
    if (tipPercent === 'custom' && !customTip) return false;
    return true;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {paymentError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setPaymentError(null)}>
          Payment Error: {paymentError}
        </Alert>
      )}

      <form onSubmit={handlePlaceOrder}>
        <Grid container spacing={3}>
          {/* Left Column - Customer Info & Payment */}
          <Grid item xs={12} md={7}>
            {/* Customer Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  fullWidth
                  type="tel"
                />
                <TextField
                  label="Email Address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  fullWidth
                  type="email"
                />
              </Stack>
            </Paper>

            {/* Delivery Method */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Delivery Method
              </Typography>
              <RadioGroup
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <FormControlLabel
                  value="pickup"
                  control={<Radio />}
                  label="Pickup"
                />
                <FormControlLabel
                  value="delivery"
                  control={<Radio />}
                  label={`Delivery (+${formatPrice(500)})`}
                />
              </RadioGroup>

              {deliveryMethod === 'delivery' && (
                <TextField
                  label="Delivery Address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ mt: 2 }}
                />
              )}

              <TextField
                label="Special Instructions (Optional)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                fullWidth
                multiline
                rows={2}
                sx={{ mt: 2 }}
                placeholder="e.g., Ring doorbell, leave at door, etc."
              />
            </Paper>

            {/* Tip */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Add a Tip
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Tip Amount</InputLabel>
                <Select
                  value={tipPercent}
                  label="Tip Amount"
                  onChange={(e) => setTipPercent(e.target.value)}
                >
                  <MenuItem value={10}>10% ({formatPrice(Math.round(subtotal * 0.10))})</MenuItem>
                  <MenuItem value={15}>15% ({formatPrice(Math.round(subtotal * 0.15))})</MenuItem>
                  <MenuItem value={20}>20% ({formatPrice(Math.round(subtotal * 0.20))})</MenuItem>
                  <MenuItem value={25}>25% ({formatPrice(Math.round(subtotal * 0.25))})</MenuItem>
                  <MenuItem value="custom">Custom Amount</MenuItem>
                  <MenuItem value={0}>No Tip</MenuItem>
                </Select>
              </FormControl>

              {tipPercent === 'custom' && (
                <TextField
                  label="Custom Tip Amount"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  fullWidth
                  sx={{ mt: 2 }}
                  placeholder="Enter dollar amount"
                />
              )}
            </Paper>

            {/* Payment Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  bgcolor: 'white'
                }}
              >
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Your payment information is securely processed by Stripe
              </Typography>
            </Paper>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              <List disablePadding>
                {cartItems.map((item, index) => (
                  <ListItem key={index} sx={{ px: 0, py: 1 }}>
                    <ListItemText
                      primary={`${item.quantity}x ${item.item_name}`}
                      secondary={item.item_description}
                    />
                    <Typography variant="body2">
                      {formatPrice(item.unit_price_cents * item.quantity)}
                    </Typography>
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{formatPrice(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tax (8%)</Typography>
                  <Typography variant="body2">{formatPrice(tax)}</Typography>
                </Box>
                {deliveryFee > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Delivery Fee</Typography>
                    <Typography variant="body2">{formatPrice(deliveryFee)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Tip</Typography>
                  <Typography variant="body2">{formatPrice(tipAmount)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={600}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color="primary">
                    {formatPrice(total)}
                  </Typography>
                </Box>
              </Stack>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !stripe || !isFormValid()}
                sx={{ mt: 3 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  `Place Order • ${formatPrice(total)}`
                )}
              </Button>

              <Button
                variant="text"
                size="small"
                fullWidth
                onClick={() => navigate('/chat')}
                sx={{ mt: 1 }}
                disabled={loading}
              >
                Back to Menu
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}

export default CheckoutScreen;
