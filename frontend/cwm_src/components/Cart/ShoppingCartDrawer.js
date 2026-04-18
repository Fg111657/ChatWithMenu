import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Button,
  Divider,
  Paper,
  Stack,
  TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCart } from '../../contexts/CartContext';

function ShoppingCartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { cartItems, removeItem, updateQuantity, clearCart, getTotal, itemCount } = useCart();

  const { subtotal, tax, deliveryFee, total } = getTotal();

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    onClose();
    navigate('/checkout');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 400 } }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h6">Your Cart</Typography>
          {itemCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              ({itemCount} item{itemCount !== 1 ? 's' : ''})
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Cart Items */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {cartItems.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              py: 8
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Your cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add items from the menu to get started
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {cartItems.map((item, index) => (
              <Paper
                key={item.id || index}
                elevation={1}
                sx={{ mb: 2, p: 2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {item.item_name}
                  </Typography>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeItem(item.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                {item.item_description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {item.item_description}
                  </Typography>
                )}

                {item.special_requests && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1 }}>
                    Note: {item.special_requests}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <TextField
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        updateQuantity(item.id, val);
                      }}
                      inputProps={{
                        min: 1,
                        max: 99,
                        style: { textAlign: 'center' }
                      }}
                      sx={{ width: 60 }}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600}>
                    {formatPrice(item.unit_price_cents * item.quantity)}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </List>
        )}
      </Box>

      {/* Cart Summary & Actions */}
      {cartItems.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack spacing={1} sx={{ mb: 2 }}>
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

            <Stack spacing={1}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </Stack>
          </Box>
        </>
      )}
    </Drawer>
  );
}

export default ShoppingCartDrawer;
