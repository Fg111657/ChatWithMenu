import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Rating,
  Stack,
  IconButton,
  Avatar,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RateReviewIcon from '@mui/icons-material/RateReview';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import StarIcon from '@mui/icons-material/Star';
import SendIcon from '@mui/icons-material/Send';

const AddReviewModal = ({ isVisible, onClose, onSubmit }) => {
  const [item, setItem] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    onSubmit(item, rating, text);
    setItem('');
    setText('');
    setRating(0);
    onClose();
  };

  const handleClose = () => {
    setItem('');
    setText('');
    setRating(0);
    onClose();
  };

  return (
    <Dialog
      open={isVisible}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <RateReviewIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Write a Review
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Share your dining experience
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label="Menu Item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="What did you order?"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <RestaurantMenuIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Your Rating
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
              }}
            >
              <Rating
                value={rating}
                onChange={(event, newValue) => setRating(newValue || 0)}
                size="large"
                icon={<StarIcon fontSize="inherit" sx={{ color: 'warning.main' }} />}
                emptyIcon={<StarIcon fontSize="inherit" />}
              />
              <Typography variant="body2" color="text.secondary">
                {rating > 0 ? `${rating} out of 5 stars` : 'Select a rating'}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Your Review"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            rows={4}
            placeholder="Tell us about your experience..."
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} sx={{ flex: 1 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          startIcon={<SendIcon />}
          disabled={!item || !rating}
          sx={{ flex: 1 }}
        >
          Submit Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddReviewModal;
