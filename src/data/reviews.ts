export interface Review {
  author: string;
  rating: number; // 1–5
  date: string;   // "Month YYYY"
  text: string;
}

// Keyed by product slug. Add reviews here as they come in.
// Product pages and the homepage both pull from this file.
export const productReviews: Record<string, Review[]> = {
  // "tarkir-dragonstorm-play-booster-display": [
  //   { author: "Jane D.", rating: 5, date: "June 2026", text: "Sealed, fast shipping, great price." },
  // ],
};

// Store-wide reviews (not tied to a specific product) shown on the homepage.
export const storeReviews: Review[] = [
  // { author: "Jane D.", rating: 5, date: "June 2026", text: "Great store, fast shipping." },
];

export function aggregateRating(reviews: Review[]) {
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return {
    "@type": "AggregateRating",
    ratingValue: (Math.round(avg * 10) / 10).toFixed(1),
    reviewCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  };
}
