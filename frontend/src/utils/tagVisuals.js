import React from 'react';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';

const TAG_TONES = {
  default: {
    bg: '#F3F5F7',
    bgSoft: '#E7ECF2',
    text: '#41576D',
    border: '#C6D0DB',
    accent: '#6B7C8F',
    ring: 'rgba(107, 124, 143, 0.18)',
  },
  limited: {
    bg: '#FFF5E8',
    bgSoft: '#FFE4C1',
    text: '#A45700',
    border: '#F5C079',
    accent: '#F28C28',
    ring: 'rgba(242, 140, 40, 0.18)',
  },
  mixed: {
    bg: '#FFF0E8',
    bgSoft: '#FFD5C2',
    text: '#B54708',
    border: '#F0A47D',
    accent: '#F97316',
    ring: 'rgba(249, 115, 22, 0.18)',
  },
  egg: {
    bg: '#FFF9DF',
    bgSoft: '#FFF0AA',
    text: '#8A6700',
    border: '#E6C84A',
    accent: '#E0B400',
    ring: 'rgba(224, 180, 0, 0.18)',
  },
  dairy: {
    bg: '#FFF1F5',
    bgSoft: '#FFD6E4',
    text: '#A83B64',
    border: '#F0A7C3',
    accent: '#E76F9A',
    ring: 'rgba(231, 111, 154, 0.18)',
  },
  nut: {
    bg: '#EEF7EE',
    bgSoft: '#D5ECD4',
    text: '#2E6A3B',
    border: '#97D19D',
    accent: '#4FA867',
    ring: 'rgba(79, 168, 103, 0.18)',
  },
  sesame: {
    bg: '#FFF3E8',
    bgSoft: '#FFDABF',
    text: '#A85A2C',
    border: '#F0B07F',
    accent: '#E67E45',
    ring: 'rgba(230, 126, 69, 0.18)',
  },
  shellfish: {
    bg: '#EAF7F6',
    bgSoft: '#CBEFEC',
    text: '#0E6F72',
    border: '#82D4D5',
    accent: '#18A6A6',
    ring: 'rgba(24, 166, 166, 0.18)',
  },
  fish: {
    bg: '#EDF5FF',
    bgSoft: '#D7E9FF',
    text: '#1B5FA7',
    border: '#97BEF5',
    accent: '#3B82F6',
    ring: 'rgba(59, 130, 246, 0.18)',
  },
  soy: {
    bg: '#EFF8EE',
    bgSoft: '#D9EFCF',
    text: '#4A6B22',
    border: '#A8CE83',
    accent: '#7CB342',
    ring: 'rgba(124, 179, 66, 0.18)',
  },
  gluten: {
    bg: '#F1F0FF',
    bgSoft: '#DDD9FF',
    text: '#5142A6',
    border: '#AAA1F2',
    accent: '#7567F8',
    ring: 'rgba(117, 103, 248, 0.18)',
  },
  legume: {
    bg: '#F6F5E8',
    bgSoft: '#E7E3BF',
    text: '#6E6822',
    border: '#C6C07A',
    accent: '#9E9D24',
    ring: 'rgba(158, 157, 36, 0.18)',
  },
  vegan: {
    bg: '#EEF9ED',
    bgSoft: '#D4F0D1',
    text: '#2E7D32',
    border: '#90D69A',
    accent: '#43A047',
    ring: 'rgba(67, 160, 71, 0.18)',
  },
  vegetarian: {
    bg: '#F4F9EC',
    bgSoft: '#DFEFC7',
    text: '#557A1F',
    border: '#B4D188',
    accent: '#7CB342',
    ring: 'rgba(124, 179, 66, 0.18)',
  },
  halal: {
    bg: '#EEF4FF',
    bgSoft: '#D9E4FF',
    text: '#3157A6',
    border: '#9EB5F2',
    accent: '#5C7CFA',
    ring: 'rgba(92, 124, 250, 0.18)',
  },
  kosher: {
    bg: '#F5EEFF',
    bgSoft: '#E5D6FF',
    text: '#6943A3',
    border: '#C2A4F2',
    accent: '#8E63D2',
    ring: 'rgba(142, 99, 210, 0.18)',
  },
  contains: {
    bg: '#FDECEC',
    bgSoft: '#F8D2D2',
    text: '#B42318',
    border: '#F1A2A2',
    accent: '#E5484D',
    ring: 'rgba(229, 72, 77, 0.18)',
  },
  mayContain: {
    bg: '#FFF6E8',
    bgSoft: '#FFE8BE',
    text: '#9A5B00',
    border: '#EDC16A',
    accent: '#D89B00',
    ring: 'rgba(216, 155, 0, 0.18)',
  },
  iceCream: {
    bg: '#F7EEFF',
    bgSoft: '#E8D6FF',
    text: '#7C3FB0',
    border: '#C59AF3',
    accent: '#A855F7',
    ring: 'rgba(168, 85, 247, 0.18)',
  },
  dessert: {
    bg: '#FFF0F6',
    bgSoft: '#FFD7E8',
    text: '#B03F72',
    border: '#F0A6C8',
    accent: '#EC4899',
    ring: 'rgba(236, 72, 153, 0.18)',
  },
  breakfast: {
    bg: '#FFF6E9',
    bgSoft: '#FFE5BC',
    text: '#9A5B1F',
    border: '#E9BD73',
    accent: '#F59E0B',
    ring: 'rgba(245, 158, 11, 0.18)',
  },
  fries: {
    bg: '#FFF8E2',
    bgSoft: '#FFECA6',
    text: '#8D6B00',
    border: '#E0C14E',
    accent: '#EAB308',
    ring: 'rgba(234, 179, 8, 0.18)',
  },
  bagels: {
    bg: '#F8EFE7',
    bgSoft: '#EAD7C8',
    text: '#7B5133',
    border: '#CDA588',
    accent: '#A56A43',
    ring: 'rgba(165, 106, 67, 0.18)',
  },
  burgers: {
    bg: '#FFF1EC',
    bgSoft: '#FFD7CC',
    text: '#A3472C',
    border: '#EFAC92',
    accent: '#F97352',
    ring: 'rgba(249, 115, 82, 0.18)',
  },
  tacos: {
    bg: '#FFF3EA',
    bgSoft: '#FFD9C4',
    text: '#A6531E',
    border: '#F0B083',
    accent: '#F97316',
    ring: 'rgba(249, 115, 22, 0.18)',
  },
  bbq: {
    bg: '#FBEDEB',
    bgSoft: '#F2D1CC',
    text: '#8C3E30',
    border: '#DB9C90',
    accent: '#B75A48',
    ring: 'rgba(183, 90, 72, 0.18)',
  },
  hotDogs: {
    bg: '#FFF4E7',
    bgSoft: '#FFE0BB',
    text: '#9B5A16',
    border: '#E8B46D',
    accent: '#F59E0B',
    ring: 'rgba(245, 158, 11, 0.18)',
  },
  pretzels: {
    bg: '#F9F1E7',
    bgSoft: '#EAD8C3',
    text: '#7A5630',
    border: '#CDA47C',
    accent: '#A97142',
    ring: 'rgba(169, 113, 66, 0.18)',
  },
  chicken: {
    bg: '#FFF1E9',
    bgSoft: '#FFD8C9',
    text: '#9A4C2A',
    border: '#E8A887',
    accent: '#F97352',
    ring: 'rgba(249, 115, 82, 0.18)',
  },
  frozenTreat: {
    bg: '#ECFBF7',
    bgSoft: '#CBF1E8',
    text: '#18796B',
    border: '#8AD5C6',
    accent: '#14B8A6',
    ring: 'rgba(20, 184, 166, 0.18)',
  },
};

const normalizeTag = (tag) => String(tag || '').trim().toLowerCase();

const CUISINE_DUPLICATE_WORDS = [
  'amusement park',
  'bakery',
  'bagel',
  'bbq',
  'barbecue',
  'breakfast',
  'burger',
  'burgers',
  'cafe',
  'coffee',
  'dessert',
  'deli',
  'french',
  'frozen treat',
  'hot dogs',
  'ice cream',
  'italian',
  'mexican',
  'pizza',
  'pretzels',
  'restaurant',
  'seafood',
  'tacos',
];

const stripTagDecorators = (normalized) => normalized
  .replace(/\+/g, '')
  .replace(/\brecommended\b/g, '')
  .replace(/\bfree\b/g, '')
  .replace(/\boptions\b/g, '')
  .trim();

const detectAllergenTone = (normalized) => {
  if (normalized.includes('shellfish')) return 'shellfish';
  if (normalized.includes('fish')) return 'fish';
  if (normalized.includes('sesame')) return 'sesame';
  if (normalized.includes('dairy')) return 'dairy';
  if (normalized.includes('egg')) return 'egg';
  if (normalized.includes('gluten')) return 'gluten';
  if (normalized.includes('soy')) return 'soy';
  if (normalized.includes('legume') || normalized.includes('pea') || normalized.includes('lentil') || normalized.includes('chickpea')) return 'legume';
  if (normalized.includes('nut') || normalized.includes('peanut') || normalized.includes('tree nut')) return 'nut';
  return null;
};

const detectSpecificToneKey = (normalized) => {
  const allergenTone = detectAllergenTone(normalized);
  if (normalized.includes('limited info')) return 'limited';
  if (normalized.includes('mixed')) return 'mixed';
  if (normalized.includes('may contain')) return allergenTone ? 'mayContain' : 'mayContain';
  if (normalized.includes('contains')) return allergenTone ? 'contains' : 'contains';
  if (normalized === 'vegan') return 'vegan';
  if (normalized === 'vegetarian') return 'vegetarian';
  if (normalized === 'halal') return 'halal';
  if (normalized === 'kosher') return 'kosher';
  if (normalized.includes('recommended') && allergenTone) return allergenTone;
  if (normalized.includes('gluten-free')) return 'gluten';
  if (normalized.includes('dairy-free')) return 'dairy';
  if (normalized.includes('egg-free')) return 'egg';
  if (normalized.includes('nut-free')) return 'nut';
  if (normalized.includes('sesame-free')) return 'sesame';
  if (normalized.includes('shellfish-free')) return 'shellfish';
  if (normalized.includes('fish-free')) return 'fish';
  if (normalized.includes('soy-free')) return 'soy';
  if (normalized.includes('legume-free')) return 'legume';
  if (normalized.includes('ice cream')) return 'iceCream';
  if (normalized.includes('frozen treat')) return 'frozenTreat';
  if (normalized.includes('dessert')) return 'dessert';
  if (normalized.includes('breakfast')) return 'breakfast';
  if (normalized.includes('fries')) return 'fries';
  if (normalized.includes('bagel')) return 'bagels';
  if (normalized.includes('burger')) return 'burgers';
  if (normalized.includes('taco')) return 'tacos';
  if (normalized.includes('bbq') || normalized.includes('barbecue')) return 'bbq';
  if (normalized.includes('hot dog')) return 'hotDogs';
  if (normalized.includes('pretzel')) return 'pretzels';
  if (normalized.includes('chicken')) return 'chicken';
  if (normalized.includes('recommended')) return 'default';
  return 'default';
};

export const shouldHideCuisineDuplicateTag = (tag, restaurant = null) => {
  const normalizedTag = stripTagDecorators(normalizeTag(tag));
  const cuisine = normalizeTag(restaurant?.cuisine_type);
  if (!normalizedTag) return false;
  if (normalizedTag === 'recommended') return true;
  if (!cuisine) return false;

  return CUISINE_DUPLICATE_WORDS.some((word) => (
    normalizedTag.includes(word) && cuisine.includes(word)
  ));
};

export const getCardTagDisplayLabel = (tag) => {
  const normalized = normalizeTag(tag);
  if (!normalized) return tag;
  if (normalized === 'recommended') return null;

  const plusMatch = normalized.match(/^(.+?)\s+recommended$/);
  if (plusMatch) {
    const label = plusMatch[1]
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${label} +`;
  }

  return tag;
};

export const getTagTone = (tag) => {
  const normalized = normalizeTag(tag);
  return TAG_TONES[detectSpecificToneKey(normalized)] || TAG_TONES.default;
};

export const getTagChipSx = (tag) => {
  const tone = getTagTone(tag);
  return {
    position: 'relative',
    overflow: 'visible',
    borderRadius: '999px',
    border: `1px solid ${tone.border}`,
    background: `linear-gradient(135deg, ${tone.bg} 0%, ${tone.bgSoft} 100%)`,
    color: tone.text,
    fontWeight: 700,
    letterSpacing: '0.01em',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.84), 0 4px 12px rgba(15, 23, 42, 0.06)',
    '& .MuiChip-label': {
      px: 1.15,
      py: 0.2,
      pl: 0.35,
      pr: 1.1,
    },
    '& .MuiChip-icon': {
      color: tone.accent,
      marginLeft: 0.85,
      marginRight: -0.25,
      fontSize: '0.92rem',
      filter: `drop-shadow(0 0 4px ${tone.ring})`,
    },
    '& .MuiChip-deleteIcon': {
      color: tone.text,
      opacity: 0.72,
      '&:hover': {
        opacity: 1,
      },
    },
  };
};

export const getTagChipIcon = (tag) => {
  const normalized = normalizeTag(tag);
  if (normalized.includes('contains')) return <ErrorOutlineRoundedIcon />;
  if (normalized.includes('may contain')) return <WarningAmberRoundedIcon />;
  if (normalized.includes('limited info') || normalized.includes('mixed')) return <InfoOutlinedIcon />;
  if (normalized.includes('+')) return <AddCircleRoundedIcon />;
  if (normalized.includes('free') || normalized.includes('recommended')) return <ShieldRoundedIcon />;
  if (normalized === 'vegan' || normalized === 'vegetarian') return <SpaRoundedIcon />;
  if (normalized === 'halal' || normalized === 'kosher') return <CheckCircleRoundedIcon />;
  return <InfoOutlinedIcon />;
};

export const getTagCategoryLabel = (tag) => {
  const normalized = normalizeTag(tag);
  if (normalized.includes('contains')) return 'Contains';
  if (normalized.includes('may contain')) return 'May Contain';
  if (normalized.includes('limited info') || normalized.includes('mixed')) return 'Heads-Up';
  if (normalized.includes('+')) return 'Pick';
  if (normalized.includes('free') || normalized.includes('recommended')) return 'Safety';
  if (normalized === 'vegan' || normalized === 'vegetarian' || normalized === 'halal' || normalized === 'kosher') return 'Dietary';
  return 'Info';
};
