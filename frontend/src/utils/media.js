/** First good image URL for a facility from API payload (photos or field images). */
export function facilityHeroImage(facility) {
  const p = facility?.photos?.[0]?.url;
  if (p) return p;
  for (const field of facility?.fields || []) {
    const u = field?.images?.[0]?.url;
    if (u) return u;
  }
  return null;
}

/** Cover for a field card. */
export function fieldThumb(field) {
  return field?.images?.[0]?.url || null;
}
