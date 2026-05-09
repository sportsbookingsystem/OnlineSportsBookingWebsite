import { prisma } from '../config/database.js';

/** Paid payments for bookings on fields that belong to this owner's facilities */
export async function ownerRevenueSummary(ownerId) {
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PAID',
      booking: {
        field: { facility: { ownerId } },
      },
    },
    include: {
      booking: {
        include: {
          field: { include: { facility: true } },
        },
      },
    },
  });
  const total = payments.reduce((a, p) => a + Number(p.amount), 0);
  return { total, count: payments.length, payments };
}
