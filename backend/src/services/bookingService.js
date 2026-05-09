/**
 * Booking domain logic
 *
 * - Availability: we check weekly AvailabilitySlot rows for the field + requested date's weekday.
 * - Double booking: prevented by DB unique constraint (fieldId, bookingDate, startTime) and
 *   by attempting create inside try/catch for Prisma P2002.
 * - Cancellation: players may cancel PENDING or CONFIRMED if booking starts more than CANCEL_HOURS hours ahead.
 * - Owner approval: if facility.approvalRequired, booking stays PENDING until owner approves (ownerApproved=true).
 */
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';
import {
  computeBookingTotalUsd,
  addHoursToTimeString,
  ALLOWED_BOOKING_DURATIONS_HOURS,
} from '../constants/sportPricing.js';

const BS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
};

const CANCEL_HOURS = 24;

/** Store booking_date as UTC midnight for the selected calendar day (YYYY-MM-DD) */
export function normalizeDateOnly(bookingDate) {
  const s =
    bookingDate instanceof Date
      ? bookingDate.toISOString().slice(0, 10)
      : String(bookingDate).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function parseTimeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(startA, endA, startB, endB) {
  const a1 = parseTimeToMinutes(startA);
  const a2 = parseTimeToMinutes(endA);
  const b1 = parseTimeToMinutes(startB);
  const b2 = parseTimeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

function dayOfWeekFromBookingInput(bookingDate) {
  const s =
    bookingDate instanceof Date
      ? bookingDate.toISOString().slice(0, 10)
      : String(bookingDate).split('T')[0];
  const [y, m, d] = s.split('-').map(Number);
  // Local calendar day (avoids UTC shifting the weekday for date-only strings)
  return new Date(y, m - 1, d).getDay();
}

/** Ensure requested slot fits within at least one availability window for that weekday */
export async function assertSlotAllowed(fieldId, bookingDate, startTime, endTime) {
  const dow = dayOfWeekFromBookingInput(bookingDate);
  const slots = await prisma.availabilitySlot.findMany({
    where: { fieldId, dayOfWeek: dow },
  });
  if (slots.length === 0) {
    throw new HttpError(
      400,
      'No availability configured for this day of week',
    );
  }
  const ok = slots.some(
    (s) =>
      parseTimeToMinutes(startTime) >= parseTimeToMinutes(s.startTime) &&
      parseTimeToMinutes(endTime) <= parseTimeToMinutes(s.endTime),
  );
  if (!ok) {
    throw new HttpError(400, 'Requested time is outside allowed hours');
  }
}

/** Block overlapping bookings (different start times but same field/date overlapping) */
export async function assertNoOverlap(fieldId, bookingDate, startTime, endTime) {
  const dateOnly = normalizeDateOnly(bookingDate);
  const existing = await prisma.booking.findMany({
    where: {
      fieldId,
      bookingDate: dateOnly,
      status: { in: [BS.PENDING, BS.CONFIRMED] },
    },
  });
  for (const b of existing) {
    if (timesOverlap(startTime, endTime, b.startTime, b.endTime)) {
      throw new HttpError(
        409,
        'This time range overlaps an existing booking',
      );
    }
  }
}

export async function createBooking({
  userId,
  fieldId,
  bookingDate,
  startTime,
  durationHours,
  notes,
}) {
  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    include: { facility: true },
  });
  if (!field || !field.isActive || !field.facility.isActive) {
    throw new HttpError(404, 'Field not available');
  }

  const dh = Number(durationHours);
  if (!ALLOWED_BOOKING_DURATIONS_HOURS.includes(dh)) {
    throw new HttpError(400, 'durationHours must be 1, 1.5, or 2');
  }

  let endTime;
  try {
    endTime = addHoursToTimeString(startTime, dh);
  } catch {
    throw new HttpError(
      400,
      'Invalid start time or duration; booking must finish on the same day before midnight.',
    );
  }

  let amount;
  try {
    amount = computeBookingTotalUsd(field.sportType, dh);
  } catch (e) {
    throw new HttpError(400, e.message || 'Could not compute price for this sport');
  }

  const dateOnly = normalizeDateOnly(bookingDate);

  await assertSlotAllowed(field.id, bookingDate, startTime, endTime);
  await assertNoOverlap(field.id, bookingDate, startTime, endTime);

  const needsApproval = field.facility.approvalRequired;
  // Bookings start PENDING. They become CONFIRMED only after payment succeeds (see paymentService)
  // and, if applicable, owner approval (ownerApproved === true).

  try {
    const booking = await prisma.booking.create({
      data: {
        fieldId: field.id,
        userId,
        bookingDate: dateOnly,
        startTime,
        endTime,
        durationHours: dh,
        status: BS.PENDING,
        ownerApproved: needsApproval ? false : true,
        notes: notes || null,
      },
      include: { field: { include: { facility: true } }, user: true },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId,
        amount,
        status: 'PENDING',
      },
    });

    return booking;
  } catch (e) {
    if (e.code === 'P2002') {
      throw new HttpError(
        409,
        'This slot is already booked (duplicate field/date/start)',
      );
    }
    throw e;
  }
}

export async function cancelBookingAsPlayer(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { field: true },
  });
  if (!booking || booking.userId !== userId) {
    throw new HttpError(404, 'Booking not found');
  }
  if (
    booking.status !== BS.PENDING &&
    booking.status !== BS.CONFIRMED
  ) {
    throw new HttpError(400, 'Booking cannot be cancelled');
  }
  const start = new Date(booking.bookingDate);
  const [sh, sm] = booking.startTime.split(':').map(Number);
  start.setUTCHours(sh, sm, 0, 0);
  const hoursLeft = (start - Date.now()) / 3600000;
  if (hoursLeft < CANCEL_HOURS) {
    throw new HttpError(
      400,
      `Cancellation must be at least ${CANCEL_HOURS} hours before start`,
    );
  }
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BS.CANCELLED,
        cancelledAt: new Date(),
      },
    }),
    prisma.payment.updateMany({
      where: { bookingId },
      data: { status: 'REFUNDED' },
    }),
  ]);
}

export async function listMyBookings(userId) {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
    include: {
      field: { include: { facility: true } },
      payment: true,
    },
  });
}

export async function ownerBookingList(ownerId) {
  return prisma.booking.findMany({
    where: { field: { facility: { ownerId } } },
    orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
    include: {
      field: { include: { facility: true } },
      user: { include: { role: true } },
      payment: true,
    },
  });
}

export async function ownerApproveBooking(bookingId, ownerId, approve) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { field: { include: { facility: true } }, payment: true },
  });
  if (!booking || booking.field.facility.ownerId !== ownerId) {
    throw new HttpError(404, 'Booking not found');
  }
  if (!booking.field.facility.approvalRequired) {
    throw new HttpError(400, 'Facility does not use approval workflow');
  }
  if (approve) {
    const nextStatus =
      booking.payment?.status === 'PAID'
        ? BS.CONFIRMED
        : BS.PENDING;
    return prisma.booking.update({
      where: { id: bookingId },
      data: { ownerApproved: true, status: nextStatus },
    });
  }
  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BS.CANCELLED,
      cancelledAt: new Date(),
      ownerApproved: false,
    },
  });
}


