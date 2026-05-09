/**
 * Image URLs restricted to the four supported sports only (no gym, pool, track, etc.).
 * Basketball · Soccer · Tennis · Volleyball
 */
export const SPORT_IMAGES = {
  basketball:
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&q=80',
  soccer:
    'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1600&q=80',
  tennis:
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=1600&q=80',
  /** Indoor volleyball court / net */
  volleyball:
    'https://images.unsplash.com/photo-1592656094267-764a45160876?w=1600&q=80',
};

export const HERO_IMAGE = SPORT_IMAGES.basketball;

/** When a venue has no photo in the API yet */
export const FALLBACK_FACILITY_IMAGE = SPORT_IMAGES.soccer;

function showcaseItem(key, caption) {
  return {
    key,
    src: SPORT_IMAGES[key],
    alt: caption,
    caption,
  };
}

export const SHOWCASE_SPORTS = [
  showcaseItem('basketball', 'Basketball'),
  showcaseItem('soccer', 'Soccer'),
  showcaseItem('tennis', 'Tennis'),
  showcaseItem('volleyball', 'Volleyball'),
];

export const COMPETITION_CARD_BACKGROUNDS = [
  SPORT_IMAGES.basketball,
  SPORT_IMAGES.soccer,
  SPORT_IMAGES.tennis,
  SPORT_IMAGES.volleyball,
];
