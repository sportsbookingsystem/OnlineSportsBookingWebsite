import { prisma } from '../config/database.js';

export async function getAdminDashboardStats() {
  const [
    users,
    facilities,
    bookings,
    revenue,
    competitions,
    rewardsPending,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.facility.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.competition.count(),
    prisma.reward.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    users,
    facilities,
    bookings,
    totalPaidAmount: Number(revenue._sum.amount || 0),
    competitions,
    rewardsPending,
  };
}
