import React from 'react';
import {
  Card,
  CardContent,
  CardActionArea,
  Box,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Stack,
  Rating,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TableBarIcon from '@mui/icons-material/TableBar';
import LocalDiningIcon from '@mui/icons-material/LocalDining';

// Parse dietary tags from JSON string
const parseDietaryTags = (tagsJson) => {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
};

// Get color for dietary tag chip
const getDietaryTagColor = (tag) => {
  if (tag.includes('vegan')) return 'success';
  if (tag.includes('vegetarian')) return 'success';
  if (tag.includes('gluten-free')) return 'warning';
  if (tag.includes('halal') || tag.includes('kosher')) return 'info';
  return 'default';
};

// Format dietary tag for display
const formatDietaryTag = (tag) => {
  return tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const RestaurantCard = ({
  restaurant,
  onSelect,
  onDelete,
  canDelete = false,
  isServerMode = false,
}) => {
  const dietaryTags = parseDietaryTags(restaurant.dietary_tags);
  const avgRating = restaurant.rating_aggregate || 0;
  const reviewCount = restaurant.review_count || 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(restaurant.id);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        onClick={() => onSelect && onSelect(restaurant)}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ width: '100%', flexGrow: 1 }}>
          {/* Header with Avatar and Delete Button */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: isServerMode ? 'info.main' : 'primary.main',
                width: 56,
                height: 56,
              }}
            >
              {isServerMode ? <TableBarIcon /> : <RestaurantIcon />}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {restaurant.name}
              </Typography>

              {/* Cuisine Type */}
              {restaurant.cuisine_type && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <LocalDiningIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {restaurant.cuisine_type}
                  </Typography>
                </Box>
              )}
            </Box>

            {canDelete && (
              <IconButton
                onClick={handleDelete}
                sx={{
                  color: 'grey.500',
                  '&:hover': { color: 'error.main' },
                }}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>

          {/* Rating */}
          {avgRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Rating
                value={avgRating}
                precision={0.1}
                readOnly
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {avgRating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </Typography>
            </Box>
          )}

          {/* Dietary Tags */}
          {dietaryTags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {dietaryTags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={formatDietaryTag(tag)}
                  size="small"
                  color={getDietaryTagColor(tag)}
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {dietaryTags.length > 3 && (
                <Chip
                  label={`+${dietaryTags.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          )}

          {/* Action Hint */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2 }}
          >
            {isServerMode ? 'Tap to assist guests' : 'Tap to view details'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default RestaurantCard;
