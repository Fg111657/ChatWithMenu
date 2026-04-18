import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

function TopMenuBar({ restaurantName, onNewChat, onAddReview, onEditReviews }) {
  // State for the anchor element of the menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Function to handle the menu opening
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Function to handle the menu closing
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Function to handle menu item selection
  const handleMenuItemClick = (option) => {
    handleClose();
    if (option === 'New Chat') {
      onNewChat();
    } else if(option === 'Add Review') {
      onAddReview();
    } else if(option === 'Edit Reviews') {
      onEditReviews();
    }
    // Add other option handlers here
  };

  return (
    <AppBar sx={{ bgcolor: 'grey.800' }} position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Chat With {restaurantName}
        </Typography>
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          aria-label="menu"
          onClick={handleMenu}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={open}
          onClose={handleClose}
        >
          <MenuItem onClick={() => handleMenuItemClick('New Chat')}>New Chat</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('Add Review')}>Add Review</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('Edit Reviews')}>Edit Reviews</MenuItem>
          <MenuItem onClick={handleClose}>Cancel</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default TopMenuBar;
