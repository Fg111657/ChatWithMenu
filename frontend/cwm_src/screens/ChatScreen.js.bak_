import React, { useEffect, useRef, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { UserContext } from '../UserContext';
import dataService from '../services/dataService';
import InputArea from '../components/Chat/InputArea';
import TopMenuBar from '../components/Chat/TopMenuBar';
import AddReviewModal from '../components/Chat/AddReviewModal';
import EditReviewsModal from '../components/Chat/EditReviewsModal';
import TypingIndicator from '../components/Chat/TypingIndicator';
import {
  List, Avatar, Card, CardContent, Box, Typography, Container,
  Divider, IconButton, Button, Chip, Paper
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { Snackbar, Alert } from '@mui/material';
import Markdown from 'react-markdown';

const ENABLE_DISH_IMAGES = false;

// ── Order Panel ───────────────────────────────────────────────────────────────
function OrderPanel({ items, onRemove, onUpdateQty, onPlaceOrder }) {
  const subtotalCents = items.reduce((s, i) => s + i.price * i.qty, 0);
  const taxCents = Math.round(subtotalCents * 0.08);
  const totalCents = subtotalCents + taxCents;
  const totalQty = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Box sx={{
      width: 300,
      minWidth: 300,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid',
      borderColor: 'divider',
      bgcolor: '#fafafa',
    }}>
      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5,
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexShrink: 0,
      }}>
        <ReceiptLongIcon fontSize="small" />
        <Typography variant="subtitle1" fontWeight={700}>Your Order</Typography>
        {totalQty > 0 && (
          <Chip
            label={totalQty}
            size="small"
            sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, height: 22 }}
          />
        )}
      </Box>

      {/* Items list */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 1.5 }}>
        {items.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 5, px: 2 }}>
            <ReceiptLongIcon sx={{ fontSize: 52, color: 'grey.300', mb: 1.5 }} />
            <Typography variant="body2" color="text.secondary" lineHeight={1.5}>
              Ask about the menu, then tap items below the chat to add them here.
            </Typography>
          </Box>
        ) : (
          items.map(item => (
            <Paper
              key={item.id}
              elevation={0}
              sx={{ mb: 1, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1, pr: 0.5, lineHeight: 1.3 }}>
                  {item.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onRemove(item.id)}
                  sx={{ p: 0.25, mt: -0.25, color: 'grey.400', '&:hover': { color: 'error.main' } }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Qty stepper */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                    sx={{ width: 26, height: 26, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <RemoveIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 24, textAlign: 'center' }}>
                    {item.qty}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    sx={{ width: 26, height: 26, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
                {/* Line price */}
                <Typography variant="body2" fontWeight={600} color="primary.main">
                  {item.price > 0 ? `$${((item.price * item.qty) / 100).toFixed(2)}` : '—'}
                </Typography>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* Totals + CTA */}
      {items.length > 0 && (
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'white', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
            <Typography variant="body2">${(subtotalCents / 100).toFixed(2)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Tax (8%)</Typography>
            <Typography variant="body2">${(taxCents / 100).toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>Total</Typography>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
              ${(totalCents / 100).toFixed(2)}
            </Typography>
          </Box>
          <Button
            fullWidth
            variant="contained"
            onClick={onPlaceOrder}
            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', py: 1 }}
          >
            Send to Kitchen 🍳
          </Button>
        </Box>
      )}
    </Box>
  );
}

// ── Main ChatScreen ───────────────────────────────────────────────────────────
function ChatScreen() {
  const bottomListRef = useRef(null);
  const location = useLocation();
  const { userId } = useContext(UserContext);
  const restaurantId = location.state?.restaurantId;
  const restaurantName = location.state?.restaurantName;

  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(-1);
  const [showAddReview, setShowAddReview] = useState(false);
  const [showEditReviews, setShowEditReviews] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [alert, setAlert] = useState(null);
  const [menuItemsFromChat, setMenuItemsFromChat] = useState([]);

  // Live order state
  const [orderItems, setOrderItems] = useState([]);

  // Scroll to bottom + fetch menu items mentioned in chat
  useEffect(() => {
    bottomListRef.current?.scrollIntoView({ behavior: 'smooth' });
    const fetchItems = async () => {
      if (messages.length <= 4) return;
      try {
        const data = await dataService.menuItemsFromChat(chatId);
        setMenuItemsFromChat(data['items'] || []);
      } catch (error) {
        console.log(error);
      }
    };
    fetchItems();
  }, [messages, chatId]);

  // Load or start chat
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        const chatData = await dataService.startChat(userId, restaurantId);
        setChatId(chatData.id);
        setMessages(JSON.parse(chatData.conversation_data));
      } catch (error) {
        console.log(error);
      }
    };
    fetchChatData();
  }, [userId, restaurantId]);

  const sendMessage = async (inputMsg) => {
    setMessages(msgs => [...msgs, { role: 'user', content: inputMsg }]);
    setLoading(true);
    try {
      const chatData = await dataService.sendMessage(chatId, inputMsg);
      setLoading(false);
      setMessages(msgs => [...msgs, chatData.response]);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  // ── Order helpers ──
  const addToOrder = (item) => {
    const id = item.id || item.menu_item_id;
    const price = item.unit_price_cents || item.price_cents || item.price || 0;
    const name = item.name || item.title || 'Item';
    setOrderItems(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { id, name, price, qty: 1 }];
    });
  };

  const removeFromOrder = (id) => setOrderItems(prev => prev.filter(i => i.id !== id));

  const updateOrderQty = (id, qty) => {
    if (qty <= 0) { removeFromOrder(id); return; }
    setOrderItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const placeOrder = () => {
    if (orderItems.length === 0) return;
    const summary = orderItems.map(i => `${i.qty}x ${i.name}`).join(', ');
    sendMessage(`I'd like to place my order: ${summary}`);
    setAlert('Order sent to kitchen! 🍳');
    setOrderItems([]);
  };

  const newChat = async () => {
    if (!restaurantId) return;
    try {
      const chatData = await dataService.startChat(userId, restaurantId, true);
      setChatId(chatData.id);
      setMessages(JSON.parse(chatData.conversation_data));
      setMenuItemsFromChat([]);
      setOrderItems([]);
    } catch (error) {
      console.log(error);
    }
  };

  const addRating = async ({ menuItem, rating, extraText }) => {
    try {
      await dataService.submitReview(userId, restaurantId, chatId, menuItem, rating, extraText);
      setShowAddReview(false);
      setAlert('Review saved!');
    } catch (error) {
      alert(error);
    }
  };

  const modifyReviews = async (reviews) => {
    await dataService.editUserRestaurantReviews(userId, restaurantId, reviews);
    setShowEditReviews(false);
    setAlert('Saved successfully!');
  };

  const loadAndShowReviews = async () => {
    const reviewData = await dataService.listUserRestaurantReviews(userId, restaurantId);
    await setReviews(reviewData);
    setShowEditReviews(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <TopMenuBar
        restaurantName={restaurantName}
        onNewChat={newChat}
        onAddReview={() => setShowAddReview(true)}
        onEditReviews={loadAndShowReviews}
      />
      <AddReviewModal
        open={showAddReview}
        onClose={() => setShowAddReview(false)}
        onSubmit={addRating}
        suggested={menuItemsFromChat}
      />
      <EditReviewsModal
        open={showEditReviews}
        onClose={() => setShowEditReviews(false)}
        onSubmit={modifyReviews}
        reviews={reviews}
      />
      <Snackbar
        open={alert !== null}
        autoHideDuration={5000}
        onClose={() => setAlert(null)}
        anchorOrigin={{ horizontal: 'center', vertical: 'top' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>{alert}</Alert>
      </Snackbar>

      {/* Main row: Chat | Order Panel */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: Chat ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Container maxWidth="md" sx={{ flex: 1, overflow: 'auto', py: 3 }}>
            <List sx={{ pb: 2 }}>
              {messages && messages.map((message, index) => {
                if (message.role === 'system') return null;
                const isUser = message.role === 'user';
                return (
                  <Card
                    key={index}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      border: 'none',
                      bgcolor: isUser ? 'primary.main' : 'grey.50',
                      maxWidth: '85%',
                      ml: isUser ? 'auto' : 0,
                      mr: isUser ? 0 : 'auto',
                      boxShadow: 1,
                    }}
                  >
                    <CardContent sx={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      py: 2, px: 2,
                      '&:last-child': { pb: 2 },
                    }}>
                      <Avatar sx={{ bgcolor: isUser ? 'primary.dark' : 'secondary.main', width: 36, height: 36, flexShrink: 0 }}>
                        {isUser ? <PersonIcon fontSize="small" /> : <RestaurantIcon fontSize="small" />}
                      </Avatar>
                      <Box sx={{
                        flex: 1, minWidth: 0,
                        '& p': { margin: 0 }, '& p + p': { mt: 1 },
                        '& ul, & ol': { my: 1, pl: 2.5 }, '& li': { mb: 0.5 },
                      }}>
                        <Typography
                          component="div"
                          variant="body2"
                          sx={{ color: isUser ? 'white' : 'text.primary', lineHeight: 1.6, '& strong': { fontWeight: 600 } }}
                        >
                          <Markdown>{message.content}</Markdown>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              <div ref={bottomListRef} />
            </List>

            {/* Quick-add chips from AI-mentioned items */}
            {menuItemsFromChat.length > 0 && (
              <Box sx={{ pb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  Tap to add to your order:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {menuItemsFromChat.map(item => (
                    <Chip
                      key={item.id || item.menu_item_id}
                      icon={<AddIcon />}
                      label={item.name || item.title}
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => addToOrder(item)}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {loading && <TypingIndicator />}
          </Container>

          <InputArea onSend={sendMessage} />
        </Box>

        {/* ── Right: Order Panel ── */}
        <OrderPanel
          items={orderItems}
          onRemove={removeFromOrder}
          onUpdateQty={updateOrderQty}
          onPlaceOrder={placeOrder}
        />
      </Box>
    </Box>
  );
}

export default ChatScreen;
