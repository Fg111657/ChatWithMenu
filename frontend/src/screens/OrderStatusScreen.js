import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import dataService from '../services/dataService';

const ORDER_STATUS_STEPS = {
  pending: 0,
  submitted: 1,
  confirmed: 2,
  ready: 3,
  completed: 4
};

const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  ready: 'Ready for Pickup/Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const ORDER_STATUS_COLORS = {
  pending: 'warning',
  submitted: 'info',
  confirmed: 'primary',
  ready: 'success',
  completed: 'success',
  cancelled: 'error'
};

function OrderStatusScreen() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderStatus();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrderStatus, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderStatus = async () => {
  if (true) { return (<div style={{padding:"2rem",textAlign:"center"}}><h2>Order Status</h2><p style={{color:"#666",marginTop:"1rem"}}>Real-time order tracking is coming soon!</p></div>); }
    try {
      const orderData = await dataService.getOrder(orderId);
      setOrder(orderData);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError(err.message || 'Failed to load order status');
      setLoading(false);
    }
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading order status...
        </Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Order not found'}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/order-history')}
          sx={{ mt: 2 }}
        >
          View Order History
        </Button>
      </Container>
    );
  }

  const activeStep = ORDER_STATUS_STEPS[order.status] || 0;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Order Confirmed!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Order #{order.id} • {formatDateTime(order.submitted_at)}
        </Typography>
        <Chip
          label={ORDER_STATUS_LABELS[order.status]}
          color={ORDER_STATUS_COLORS[order.status]}
          sx={{ mt: 2 }}
        />
      </Box>

      {/* Order Status Stepper */}
      {order.status !== 'cancelled' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Order Progress
          </Typography>
          <Stepper activeStep={activeStep} sx={{ mt: 3 }}>
            <Step>
              <StepLabel>Submitted</StepLabel>
            </Step>
            <Step>
              <StepLabel>Confirmed</StepLabel>
            </Step>
            <Step>
              <StepLabel>Preparing</StepLabel>
            </Step>
            <Step>
              <StepLabel>
                {order.delivery_method === 'delivery' ? 'Delivering' : 'Ready for Pickup'}
              </StepLabel>
            </Step>
          </Stepper>

          {order.estimated_ready_at && (
            <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon color="primary" />
              <Typography variant="body1">
                Estimated ready time: {formatDateTime(order.estimated_ready_at)}
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Delivery Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {order.delivery_method === 'delivery' ? 'Delivery' : 'Pickup'} Information
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {order.delivery_method === 'delivery' ? (
              <LocalShippingIcon color="primary" />
            ) : (
              <RestaurantIcon color="primary" />
            )}
            <Typography variant="body1" fontWeight={600}>
              {order.delivery_method === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
            </Typography>
          </Box>
          {order.delivery_method === 'delivery' ? (
            <Typography variant="body2" color="text.secondary">
              {order.delivery_address}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Restaurant Address (to be shown here)
            </Typography>
          )}
          {order.customer_name && (
            <Typography variant="body2">
              <strong>Name:</strong> {order.customer_name}
            </Typography>
          )}
          {order.customer_phone && (
            <Typography variant="body2">
              <strong>Phone:</strong> {order.customer_phone}
            </Typography>
          )}
          {order.customer_email && (
            <Typography variant="body2">
              <strong>Email:</strong> {order.customer_email}
            </Typography>
          )}
          {order.special_instructions && (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Special Instructions:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.special_instructions}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Order Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Items
        </Typography>
        <List disablePadding>
          {order.items && order.items.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <Divider />}
              <ListItem sx={{ px: 0, py: 2 }}>
                <ListItemText
                  primary={
                    <Typography variant="body1">
                      {item.quantity}x {item.item_name}
                    </Typography>
                  }
                  secondary={
                    <>
                      {item.item_description && (
                        <Typography variant="body2" color="text.secondary">
                          {item.item_description}
                        </Typography>
                      )}
                      {item.customizations && (
                        <Typography variant="caption" color="text.secondary">
                          Customizations: {item.customizations}
                        </Typography>
                      )}
                      {item.special_requests && (
                        <Typography variant="caption" color="primary">
                          Note: {item.special_requests}
                        </Typography>
                      )}
                    </>
                  }
                />
                <Typography variant="body1" fontWeight={600}>
                  {formatPrice(item.total_price_cents)}
                </Typography>
              </ListItem>
            </React.Fragment>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Order Total */}
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">{formatPrice(order.subtotal_cents)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Tax</Typography>
            <Typography variant="body2">{formatPrice(order.tax_cents)}</Typography>
          </Box>
          {order.tip_cents > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Tip</Typography>
              <Typography variant="body2">{formatPrice(order.tip_cents)}</Typography>
            </Box>
          )}
          {order.delivery_fee_cents > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Delivery Fee</Typography>
              <Typography variant="body2">{formatPrice(order.delivery_fee_cents)}</Typography>
            </Box>
          )}
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={600}>
              Total
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary">
              {formatPrice(order.total_cents)}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Payment Status */}
      {order.payment && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Payment Status
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Chip
              label={order.payment.status.toUpperCase()}
              color={order.payment.status === 'succeeded' ? 'success' : 'warning'}
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              {order.payment.payment_method} • {formatPrice(order.payment.amount_cents)}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Actions */}
      <Stack spacing={2}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate('/order-history')}
        >
          View Order History
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => navigate('/chat')}
        >
          Order Again
        </Button>
      </Stack>
    </Container>
  );
}

export default OrderStatusScreen;
