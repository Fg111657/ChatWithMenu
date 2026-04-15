import React, { useState } from 'react';
import { Modal, Box, Typography, TextField, Button, Rating, Autocomplete } from '@mui/material';

// TODO: Recommend the menu items from chat
function AddReviewModal({ open, onClose, onSubmit, suggested }) {
  const [menuItem, setMenuItem] = useState('');
  const [rating, setRating] = useState(0);
  const [extraText, setExtraText] = useState('');

  const onSubmitLocal = () => {
    onSubmit({ menuItem, rating, extraText });
    onClose(); // Close the modal after submission
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    outline: 'none',
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" mb={2}>
          Add Review
        </Typography>
        <Autocomplete
          freeSolo
          label="Menu Item"
          fullWidth
          margin="normal"
          options={suggested}
          renderInput={(params) => <TextField {...params} label="MenuItem" />}
          onInputChange={(event, newInputValue) => setMenuItem(newInputValue)}
        />
        <Typography component="legend">Rating</Typography>
        <Rating
          name="rating"
          value={rating}
          onChange={(e, newValue) => setRating(newValue)}
          precision={1}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Extra Comments (optional)"
          fullWidth
          multiline
          rows={4}
          margin="normal"
          value={extraText}
          onChange={(e) => setExtraText(e.target.value)}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={onSubmitLocal}>Submit</Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default AddReviewModal;
