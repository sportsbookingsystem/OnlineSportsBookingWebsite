import * as paymentService from '../services/paymentService.js';
import { getStripeClient } from '../config/stripe.js';
import { HttpError } from '../utils/httpError.js';

export async function payBooking(req, res, next) {
  try {
    const out = await paymentService.createCheckoutForBooking(
      Number(req.params.bookingId),
      req.user.id,
    );
    res.json({ success: true, checkoutUrl: out.checkoutUrl });
  } catch (e) {
    next(e);
  }
}

export async function stripeWebhook(req, res, next) {
  try {
    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      throw new HttpError(500, 'Payment webhook is not configured');
    }
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      throw new HttpError(400, 'Missing webhook signature');
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      await paymentService.finalizeCheckoutSession(event.data.object);
    }
    res.json({ received: true });
  } catch (e) {
    next(e);
  }
}
