import React, { useState, useEffect } from 'react';
import { TextField, Paper, Box, IconButton, Chip, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';

// Quick preference suggestions that rotate
const PREFERENCE_CHIPS = [
  // Dietary preferences
  'What vegetarian options do you have?',
  'Show me gluten-free dishes',
  'Any vegan choices?',
  'Low-carb options please',
  'What\'s dairy-free?',
  // Recommendations
  'What do you recommend for me?',
  'What\'s popular here?',
  'Chef\'s special today?',
  'Best value on the menu?',
  // Specific needs
  'I have nut allergies - what\'s safe?',
  'Kid-friendly options?',
  'Something light and healthy',
  'I\'m in the mood for something spicy',
  'What pairs well together?',
];

function InputArea({ onSend, messageHints }) {
  const [input, setInput] = useState('');
  const [visibleChips, setVisibleChips] = useState([]);
  const [chipIndex, setChipIndex] = useState(0);

  // Initialize and rotate chips
  useEffect(() => {
    const getNextChips = (startIndex) => {
      const chips = [];
      for (let i = 0; i < 3; i++) {
        chips.push(PREFERENCE_CHIPS[(startIndex + i) % PREFERENCE_CHIPS.length]);
      }
      return chips;
    };

    setVisibleChips(getNextChips(chipIndex));
  }, [chipIndex]);

  // Auto-rotate chips every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChipIndex((prev) => (prev + 3) % PREFERENCE_CHIPS.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefreshChips = () => {
    setChipIndex((prev) => (prev + 3) % PREFERENCE_CHIPS.length);
  };

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (text) => {
    onSend(text);
    // Rotate to new chips after selection
    handleRefreshChips();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        bottom: 0,
        p: 2,
        borderRadius: '16px 16px 0 0',
        bgcolor: 'background.paper',
      }}
    >
      {/* Quick suggestion chips */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flex: 1,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.300',
              borderRadius: 2,
            },
          }}
        >
          {visibleChips.map((chip, index) => (
            <Chip
              key={`${chipIndex}-${index}`}
              label={chip}
              onClick={() => handleChipClick(chip)}
              clickable
              variant="outlined"
              color="primary"
              size="small"
              sx={{
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'primary.main',
                  color: 'white',
                },
              }}
            />
          ))}
        </Stack>
        <IconButton
          size="small"
          onClick={handleRefreshChips}
          sx={{ ml: 1, color: 'grey.500' }}
          title="More suggestions"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Input field with send button */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about the menu..."
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'grey.50',
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          color="primary"
          disabled={!input.trim()}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 48,
            height: 48,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'grey.300',
              color: 'grey.500',
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}

export default InputArea;
