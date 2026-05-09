import Stripe from 'stripe';
import { HttpError } from '../utils/httpError.js';

let stripeClient = null;

function mustEnv(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

export function getStripeClient() {
  const secretKey = mustEnv('STRIPE_SECRET_KEY');
  if (!secretKey) {
    throw new HttpError(
      500,
      'Payment is not configured. Set STRIPE_SECRET_KEY in the server environment.',
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export function getPaymentRedirectUrls() {
  const base = (
    mustEnv('FRONTEND_PUBLIC_URL') || 'http://localhost:5173'
  ).replace(/\/$/, '');
  const successUrl =
    mustEnv('PAYMENT_SUCCESS_URL') || `${base}/booking?payment=success`;
  const cancelUrl =
    mustEnv('PAYMENT_CANCEL_URL') || `${base}/booking?payment=cancel`;
  return { successUrl, cancelUrl };
}
