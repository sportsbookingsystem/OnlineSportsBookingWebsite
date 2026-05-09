/**
 * Stripe Checkout: player is redirected to Stripe’s hosted page (card entry).
 * Webhook `checkout.session.completed` marks the booking paid.
 */
import { prisma } from '../config/database.js';
import { getPaymentRedirectUrls, getStripeClient } from '../config/stripe.js';
import { HttpError } from '../utils/httpError.js';

function toStripeAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function createCheckoutForBooking(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { field: { include: { facility: true } }, payment: true },
  });
  if (!booking || booking.userId !== userId) {
    throw new HttpError(404, 'Booking not found');
  }
  if (!booking.payment) throw new HttpError(400, 'No payment record');
  if (booking.payment.status === 'PAID') {
    throw new HttpError(400, 'Booking is already paid');
  }
  if (booking.status === 'CANCELLED') {
    throw new HttpError(400, 'Booking is cancelled');
  }
  if (booking.field.facility.approvalRequired && !booking.ownerApproved) {
    throw new HttpError(
      400,
      'Owner must approve this booking before you can pay',
    );
  }

  const unitAmount = toStripeAmount(booking.payment.amount);
  if (!unitAmount) {
    throw new HttpError(400, 'Invalid payment amount');
  }

  const stripe = getStripeClient();
  const { successUrl, cancelUrl } = getPaymentRedirectUrls();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId: String(booking.id),
      userId: String(userId),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name: `${booking.field.sportType} - ${booking.field.name}`,
            description: `${booking.field.facility.name} (${booking.startTime}-${booking.endTime})`,
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new HttpError(500, 'Could not start payment checkout');
  }
  return { checkoutUrl: session.url, sessionId: session.id };
}

export async function finalizeCheckoutSession(session) {
  if (!session || session.payment_status !== 'paid') {
    return { updated: false };
  }
  const bookingId = Number(session.metadata?.bookingId);
  const userId = Number(session.metadata?.userId);
  if (!Number.isFinite(bookingId) || !Number.isFinite(userId)) {
    return { updated: false };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { field: { include: { facility: true } }, payment: true },
  });
  if (!booking || booking.userId !== userId || !booking.payment) {
    return { updated: false };
  }
  if (booking.payment.status === 'PAID') {
    return { updated: false };
  }
  if (booking.status === 'CANCELLED') {
    return { updated: false };
  }
  if (booking.field.facility.approvalRequired && !booking.ownerApproved) {
    return { updated: false };
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: 'PAID' },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
    }),
  ]);

  return { updated: true };
}
