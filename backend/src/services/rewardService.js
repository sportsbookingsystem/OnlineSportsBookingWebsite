/**
 * Reward / “cashback” logic (intentionally simple for academic explanation)
 *
 * When an admin finalizes a match result with a winning team:
 *  1. BOOKING_POOL component: take a small percentage of all PAID booking revenue
 *     in the system (demo: 5%) and assign a fixed share to this winner for presentation.
 *     (In a real product you would scope revenue by facility, league, date range, etc.)
 *  2. SPONSOR component: sum `rewardContribution` from APPROVED sponsorship rows
 *     tied to the same competition.
 *  3. Store one Reward row with source COMBINED and a textual breakdown for UI.
 *
 * Admin later sets reward status APPROVED then PAID to simulate payout approval.
 */
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

const PLATFORM_POOL_RATE = 0.05;
const WINNER_SHARE_OF_POOL = 0.25; // winner gets 25% of the computed platform pool (demo)

export async function listRewardsForUser(userId) {
  const memberTeams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = memberTeams.map((m) => m.teamId);
  if (teamIds.length === 0) return [];
  return prisma.reward.findMany({
    where: { teamId: { in: teamIds } },
    orderBy: { createdAt: 'desc' },
    include: { team: true, competition: true },
  });
}

export async function createRewardForWinningTeam({
  competitionId,
  winnerTeamId,
}) {
  const paid = await prisma.payment.aggregate({
    where: { status: 'PAID' },
    _sum: { amount: true },
  });
  const totalPaid = Number(paid._sum.amount || 0);
  const platformPool = totalPaid * PLATFORM_POOL_RATE;
  const bookingComponent =
    Math.round(platformPool * WINNER_SHARE_OF_POOL * 100) / 100;

  const sponsorRows = await prisma.sponsorship.findMany({
    where: {
      competitionId,
      status: 'APPROVED',
    },
  });
  const sponsorComponent =
    Math.round(
      sponsorRows.reduce((a, s) => a + Number(s.rewardContribution), 0) * 100,
    ) / 100;

  const total =
    Math.round((bookingComponent + sponsorComponent) * 100) / 100;

  const note = `Pool share from bookings: ${bookingComponent.toFixed(
    2,
  )} (5% pool × 25% winner demo rule). Sponsor pledges: ${sponsorComponent.toFixed(
    2,
  )}.`;

  return prisma.reward.create({
    data: {
      teamId: winnerTeamId,
      competitionId,
      amount: total,
      source: 'COMBINED',
      status: 'PENDING',
      descriptionNote: note,
    },
  });
}

export async function adminUpdateRewardStatus(rewardId, status) {
  const r = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!r) throw new HttpError(404, 'Reward not found');
  return prisma.reward.update({
    where: { id: rewardId },
    data: {
      status,
      finalizedAt: status === 'PAID' ? new Date() : r.finalizedAt,
    },
  });
}

export async function adminListRewards() {
  return prisma.reward.findMany({
    orderBy: { createdAt: 'desc' },
    include: { team: true, competition: true },
  });
}
