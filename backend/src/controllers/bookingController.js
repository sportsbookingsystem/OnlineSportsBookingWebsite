import * as bookingService from '../services/bookingService.js';
import { validationResult } from 'express-validator';

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const booking = await bookingService.createBooking({
      userId: req.user.id,
      fieldId: Number(req.body.fieldId),
      bookingDate: req.body.bookingDate,
      startTime: req.body.startTime,
      durationHours: req.body.durationHours,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, booking });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req, res, next) {
  try {
    const bookings = await bookingService.listMyBookings(req.user.id);
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
}

export async function cancelMine(req, res, next) {
  try {
    await bookingService.cancelBookingAsPlayer(
      Number(req.params.id),
      req.user.id,
    );
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (e) {
    next(e);
  }
}

export async function ownerList(req, res, next) {
  try {
    const bookings = await bookingService.ownerBookingList(req.user.id);
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
}

export async function ownerApprove(req, res, next) {
  try {
    const booking = await bookingService.ownerApproveBooking(
      Number(req.params.id),
      req.user.id,
      req.body.approve === true,
    );
    res.json({ success: true, booking });
  } catch (e) {
    next(e);
  }
}

export async function adminList(req, res, next) {
  try {
    const { prisma } = await import('../config/database.js');
    const bookings = await prisma.booking.findMany({
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
      include: {
        field: { include: { facility: true } },
        user: { include: { role: true } },
        payment: true,
      },
    });
    res.json({ success: true, bookings });
  } catch (e) {
    next(e);
  }
}
