import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import dataService from '../services/dataService';

const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  ready: 'Ready',
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

function OrderHistoryScreen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
  if (true) { return (<div style={{padding:"2rem",textAlign:"center"}}><h2>Order History</h2><p style={{color:"#666",marginTop:"1rem"}}>Your order history will appear here once online ordering is available.</p></div>); }
    try {
      const ordersData = await dataService.getUserOrders();
      // Sort by created_at descending (newest first)
      const sortedOrders = ordersData.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      setOrders(sortedOrders);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to load order history');
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

  const getFilteredOrders = () => {
    if (filterStatus === 'all') return orders;
    return orders.filter(order => order.status === filterStatus);
  };

  const handleViewOrder = (orderId) => {
    navigate(`/order-status/${orderId}`);
  };

  const handleReorder = (order) => {
    // TODO: Implement reorder functionality
    // This would add all items from the order back to the cart
    navigate('/chat');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading order history...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/chat')}
          sx={{ mt: 2 }}
        >
          Back to Menu
        </Button>
      </Container>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4">
            Order History
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate('/chat')}
        >
          Order Again
        </Button>
      </Box>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filterStatus}
            label="Filter by Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Orders</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="submitted">Submitted</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {filterStatus === 'all' ? 'No orders yet' : 'No orders with this status'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {filterStatus === 'all'
              ? "Start chatting with a restaurant to place your first order!"
              : "Try selecting a different status filter"}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/chat')}
          >
            Browse Restaurants
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredOrders.map((order) => (
            <Grid item xs={12} key={order.id}>
              <Card>
                <CardContent>
                  {/* Order Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        Order #{order.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(order.created_at)}
                      </Typography>
                    </Box>
                    <Chip
                      label={ORDER_STATUS_LABELS[order.status]}
                      color={ORDER_STATUS_COLORS[order.status]}
                      size="small"
                    />
                  </Box>

                  {/* Delivery Method */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {order.delivery_method === 'delivery' ? (
                      <>
                        <LocalShippingIcon fontSize="small" color="primary" />
                        <Typography variant="body2">
                          Delivery to {order.delivery_address?.substring(0, 50)}
                          {order.delivery_address?.length > 50 ? '...' : ''}
                        </Typography>
                      </>
                    ) : (
                      <>
                        <RestaurantIcon fontSize="small" color="primary" />
                        <Typography variant="body2">Pickup</Typography>
                      </>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Order Items Summary */}
                  <Stack spacing={1} sx={{ mb: 2 }}>
                    {order.items && order.items.slice(0, 3).map((item) => (
                      <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">
                          {item.quantity}x {item.item_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatPrice(item.total_price_cents)}
                        </Typography>
                      </Box>
                    ))}
                    {order.items && order.items.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        + {order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                      </Typography>
                    )}
                  </Stack>

                  {/* Order Total */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Total
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="primary">
                      {formatPrice(order.total_cents)}
                    </Typography>
                  </Box>

                  {/* Payment Status */}
                  {order.payment && (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={`Payment: ${order.payment.status}`}
                        size="small"
                        color={order.payment.status === 'succeeded' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleViewOrder(order.id)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleReorder(order)}
                  >
                    Order Again
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default OrderHistoryScreen;
