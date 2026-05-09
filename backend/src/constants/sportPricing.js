/**
 * Platform-wide USD rates per hour (whole field/court). Used for player checkout.
 */
export const ALLOWED_BOOKING_DURATIONS_HOURS = [1, 1.5, 2];

/** Lowercase keys match normalized sport names from fields. */
export const HOURLY_RATE_USD_BY_SPORT = {
  soccer: 120,
  basketball: 60,
  tennis: 40,
  volleyball: 50,
};

export function normalizeSportType(sportType) {
  return String(sportType || '')
    .trim()
    .toLowerCase();
}

export function getHourlyRateUsd(sportType) {
  const key = normalizeSportType(sportType);
  const rate = HOURLY_RATE_USD_BY_SPORT[key];
  if (rate == null) {
    throw new Error(
      `Unsupported sport for pricing: "${sportType}". Use Soccer, Basketball, Tennis, or Volleyball.`,
    );
  }
  return rate;
}

export function computeBookingTotalUsd(sportType, durationHours) {
  const d = Number(durationHours);
  if (!ALLOWED_BOOKING_DURATIONS_HOURS.includes(d)) {
    throw new Error('durationHours must be 1, 1.5, or 2');
  }
  const hourly = getHourlyRateUsd(sportType);
  return Math.round(hourly * d * 100) / 100;
}

export function addHoursToTimeString(startTime, durationHours) {
  const [h, m] = startTime.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    throw new Error('Invalid startTime');
  }
  const totalMinutes = h * 60 + m + durationHours * 60;
  if (totalMinutes >= 24 * 60) {
    throw new Error('Booking must end before midnight on the same day');
  }
  const eh = Math.floor(totalMinutes / 60);
  const em = Math.round(totalMinutes % 60);
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}
