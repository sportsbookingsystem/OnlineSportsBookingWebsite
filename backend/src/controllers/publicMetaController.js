import {
  HOURLY_RATE_USD_BY_SPORT,
  ALLOWED_BOOKING_DURATIONS_HOURS,
} from '../constants/sportPricing.js';

export function sportPricing(_req, res) {
  res.json({
    success: true,
    hourlyRatesUsd: HOURLY_RATE_USD_BY_SPORT,
    allowedDurationsHours: ALLOWED_BOOKING_DURATIONS_HOURS,
  });
}
