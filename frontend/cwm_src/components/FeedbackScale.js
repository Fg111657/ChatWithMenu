import React from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// Utility function to interpolate color
const interpolateColor = (value, min, max) => {
  const scale = (value - min) / (max - min);
  const red = Math.round(255 * (1 - scale));
  const green = Math.round(255 * scale);
  return `rgb(${red}, ${green}, 0)`; // Interpolating between red and green
};

const FeedbackButton = ({ number, onPress, isSelected }) => {
  const backgroundColor = interpolateColor(number, 1, 10);
  const buttonStyle = {
    backgroundColor: isSelected ? 'inherit' : backgroundColor,
    color: isSelected ? 'inherit' : 'white',
  };

  return (
    <Button
      variant={isSelected ? "outlined" : "contained"}
      onClick={onPress}
      style={buttonStyle}
    >
      {number}
    </Button>
  );
};

const FeedbackScale = ({ scaleText, selectedNumber, setSelectedNumber }) => {
  return (
    <Paper>
      <Typography variant="h5">{scaleText}</Typography>
      <Paper>
        {Array.from({ length: 10 }, (_, i) => (
          <FeedbackButton
            key={i + 1}
            number={i + 1}
            isSelected={selectedNumber === i + 1}
            onPress={() => setSelectedNumber(i + 1)}
          />
        ))}
      </Paper>
    </Paper>
  );
};

export default FeedbackScale;
