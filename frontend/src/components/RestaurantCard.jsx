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
import {
  getCardTagDisplayLabel,
  getTagChipIcon,
  getTagChipSx,
  shouldHideCuisineDuplicateTag,
} from '../utils/tagVisuals';

const parseDietaryTags = (tagsJson) => {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
};

const formatDietaryTag = (tag) => (
  tag
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
);

const buildFallbackCardTags = (restaurant) => {
  const tags = [];

  const dietaryDisplayTags = Array.isArray(restaurant.dietary_display_tags)
    ? restaurant.dietary_display_tags
    : [];

  for (const tag of dietaryDisplayTags) {
    if (tags.length >= 5) break;
    if (tag === 'Recommended') continue;
    tags.push(tag);
  }

  return tags.slice(0, 5);
};

const getVisibleCardTags = (restaurant) => {
  const rawTags = Array.isArray(restaurant.card_tags) && restaurant.card_tags.length > 0
    ? restaurant.card_tags
    : (() => {
        const fallbackTags = buildFallbackCardTags(restaurant);
        if (fallbackTags.length > 0) return fallbackTags;
        return parseDietaryTags(restaurant.dietary_tags).map(formatDietaryTag);
      })();

  const seenValues = new Set();
  const normalizedTags = rawTags.filter((tag) => {
    const displayLabel = getCardTagDisplayLabel(tag);
    if (!tag || !displayLabel || shouldHideCuisineDuplicateTag(displayLabel, restaurant) || seenValues.has(displayLabel)) {
      return false;
    }
    seenValues.add(displayLabel);
    return true;
  });
  return normalizedTags.slice(0, 5);
};

const getDisplayRating = (restaurant) => {
  const displayRating = Number(restaurant.display_rating);
  if (!Number.isNaN(displayRating) && displayRating > 0) {
    return displayRating;
  }

  const aggregateRating = Number(restaurant.rating_aggregate);
  if (!Number.isNaN(aggregateRating) && aggregateRating > 0) {
    return aggregateRating;
  }

  const googleRating = Number(restaurant.google_rating);
  if (!Number.isNaN(googleRating) && googleRating > 0) {
    return googleRating;
  }

  return 0;
};

const getDisplayReviewCount = (restaurant) => {
  const displayCount = Number(restaurant.display_review_count);
  if (!Number.isNaN(displayCount) && displayCount > 0) {
    return displayCount;
  }

  const reviewCount = Number(restaurant.review_count);
  if (!Number.isNaN(reviewCount) && reviewCount > 0) {
    return reviewCount;
  }

  const googleReviewCount = Number(restaurant.google_user_ratings_total);
  if (!Number.isNaN(googleReviewCount) && googleReviewCount > 0) {
    return googleReviewCount;
  }

  return 0;
};

const getRatingSource = (restaurant) => {
  if (restaurant.rating_source) {
    return restaurant.rating_source;
  }

  const reviewCount = Number(restaurant.review_count);
  if (!Number.isNaN(reviewCount) && reviewCount > 0) {
    return 'reviews';
  }

  const googleReviewCount = Number(restaurant.google_user_ratings_total);
  if (!Number.isNaN(googleReviewCount) && googleReviewCount > 0) {
    return 'google';
  }

  return null;
};

const RestaurantCard = ({
  restaurant,
  onSelect,
  onDelete,
  canDelete = false,
  isServerMode = false,
}) => {
  const visibleCardTags = getVisibleCardTags(restaurant);
  const avgRating = getDisplayRating(restaurant);
  const reviewCount = getDisplayReviewCount(restaurant);
  const ratingSource = getRatingSource(restaurant);

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

              {restaurant.address && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.75,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {restaurant.address}
                </Typography>
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
                {avgRating.toFixed(1)} ({reviewCount} {ratingSource === 'google' ? 'Google ' : ''}{reviewCount === 1 ? 'review' : 'reviews'})
              </Typography>
            </Box>
          )}

          {/* Curated Card Tags */}
          {visibleCardTags.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {visibleCardTags.map((tag) => (
                <Chip
                  key={tag}
                  label={getCardTagDisplayLabel(tag)}
                  size="small"
                  icon={getTagChipIcon(tag)}
                  variant="filled"
                  sx={{
                    fontSize: '0.72rem',
                    ...getTagChipSx(tag),
                  }}
                />
              ))}
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
