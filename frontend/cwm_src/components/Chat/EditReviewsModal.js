import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Rating, List, ListItem, Divider } from '@mui/material';

function EditReviewsModal({ open, onClose, onSubmit, reviews }) {
  const [editableReviews, setEditableReviews] = useState([]);

  useEffect(() => {
    // Initialize editable reviews when the modal is opened
    if (open) {
      setEditableReviews(reviews.map(review => ({ ...review })));
    }
  }, [reviews, open]);

  const handleReviewChange = (id, field, value) => {
    setEditableReviews(editableReviews.map(review => 
      review.id === id ? { ...review, [field]: value } : review
    ));
  };

  const onSubmitLocal = () => {
    onSubmit(editableReviews);
    onClose(); // Close the modal after submission
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600,
    maxHeight: '80%',
    overflow: 'auto',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    outline: 'none',
  };

  const listContainerStyle = {
    maxHeight: '60vh', // Adjust this value as needed
    overflow: 'auto',
    mb: 2,
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>
          Edit Reviews
        </Typography>
        <Box sx={listContainerStyle}>
          <List>
            {editableReviews.map((review) => (
              <React.Fragment key={review.id}>
                <ListItem>
                  <Box sx={{ width: '100%' }}>
                    <TextField 
                      fullWidth 
                      label="Item" 
                      variant="outlined" 
                      value={review.item}
                      onChange={(e) => handleReviewChange(review.id, 'item', e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Rating 
                      name={`rating-${review.id}`} 
                      value={review.rating} 
                      precision={1} 
                      onChange={(e, newValue) => handleReviewChange(review.id, 'rating', newValue)}
                      sx={{ mb: 2 }} 
                    />
                    <TextField 
                      fullWidth 
                      multiline 
                      minRows={3} 
                      label="Review Text" 
                      variant="outlined" 
                      value={review.review_text}
                      onChange={(e) => handleReviewChange(review.id, 'review_text', e.target.value)}
                    />
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={onSubmitLocal}>Save</Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default EditReviewsModal;
