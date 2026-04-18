import React from 'react';
import { Box, Avatar } from '@mui/material';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { keyframes } from '@mui/system';

const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
`;

function TypingIndicator() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        maxWidth: '80%',
      }}
    >
      <Avatar sx={{ bgcolor: 'secondary.main' }}>
        <RestaurantIcon />
      </Avatar>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: 'grey.100',
          borderRadius: '20px 20px 20px 4px',
          px: 2.5,
          py: 1.5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'grey.500',
              animation: `${bounce} 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default TypingIndicator;
