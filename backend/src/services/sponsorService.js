import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

async function getSponsorForUser(userId) {
  const s = await prisma.sponsor.findUnique({ where: { userId } });
  if (!s) throw new HttpError(400, 'Sponsor profile missing');
  return s;
}

export async function getSponsorProfileRow(userId) {
  return prisma.sponsor.findUnique({ where: { userId } });
}

export async function updateSponsorProfile(userId, data) {
  const s = await prisma.sponsor.findUnique({ where: { userId } });
  if (!s) throw new HttpError(404, 'Sponsor profile not found');
  const patch = {};
  if (data.companyName !== undefined) patch.companyName = data.companyName;
  if (data.website !== undefined) patch.website = data.website || null;
  if (data.description !== undefined) patch.description = data.description || null;
  if (data.logoUrl !== undefined) patch.logoUrl = data.logoUrl || null;
  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'No profile fields to update');
  }
  return prisma.sponsor.update({
    where: { userId },
    data: patch,
  });
}

export async function createOffer(userId, data) {
  const sponsor = await getSponsorForUser(userId);
  return prisma.sponsorship.create({
    data: {
      sponsorId: sponsor.id,
      competitionId: data.competitionId,
      amount: data.amount,
      rewardContribution: data.rewardContribution ?? 0,
      status: 'PENDING',
      notes: data.notes || null,
    },
    include: { competition: true },
  });
}

export async function listMySponsorships(userId) {
  const sponsor = await getSponsorForUser(userId);
  return prisma.sponsorship.findMany({
    where: { sponsorId: sponsor.id },
    orderBy: { createdAt: 'desc' },
    include: { competition: true },
  });
}

export async function adminSetSponsorshipStatus(id, status) {
  const row = await prisma.sponsorship.findUnique({ where: { id } });
  if (!row) throw new HttpError(404, 'Sponsorship not found');
  return prisma.sponsorship.update({
    where: { id },
    data: { status },
  });
}

export async function listSponsorsPublic() {
  return prisma.sponsor.findMany({
    include: {
      user: { select: { name: true, email: true } },
      sponsorships: {
        where: { status: 'APPROVED' },
        include: { competition: true },
      },
    },
  });
}

export async function getSponsorAnalytics(userId) {
  const sponsor = await getSponsorForUser(userId);
  const sponsorships = await prisma.sponsorship.findMany({
    where: { sponsorId: sponsor.id },
    include: {
      competition: {
        include: {
          teams: true,
          matches: { include: { result: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sponsorships.map((s) => ({
    sponsorshipId: s.id,
    status: s.status,
    amount: s.amount,
    rewardContribution: s.rewardContribution,
    sponsorAcknowledged: s.sponsorAcknowledged,
    adHeadline: s.adHeadline,
    adImageUrl: s.adImageUrl,
    competition: {
      id: s.competition.id,
      name: s.competition.name,
      status: s.competition.status,
      teamCount: s.competition.teams.length,
      matchCount: s.competition.matches.length,
      playedMatches: s.competition.matches.filter((m) => m.status === 'played')
        .length,
    },
  }));
}

function assertOptionalUrl(s) {
  if (s == null || s === '') return;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
  } catch {
    throw new HttpError(400, 'adImageUrl must be a valid URL');
  }
}

export async function updateSponsorshipAd(userId, sponsorshipId, body) {
  const sponsor = await getSponsorForUser(userId);
  const row = await prisma.sponsorship.findFirst({
    where: { id: sponsorshipId, sponsorId: sponsor.id, status: 'APPROVED' },
  });
  if (!row) throw new HttpError(404, 'Approved sponsorship not found');

  const adHeadline =
    body.adHeadline !== undefined ? body.adHeadline || null : undefined;
  const adImageUrl =
    body.adImageUrl !== undefined ? body.adImageUrl || null : undefined;
  if (adImageUrl) assertOptionalUrl(adImageUrl);

  return prisma.sponsorship.update({
    where: { id: sponsorshipId },
    data: {
      ...(adHeadline !== undefined ? { adHeadline } : {}),
      ...(adImageUrl !== undefined ? { adImageUrl } : {}),
    },
    include: { competition: true },
  });
}

export async function acknowledgeSponsorship(userId, sponsorshipId) {
  const sponsor = await getSponsorForUser(userId);
  const row = await prisma.sponsorship.findFirst({
    where: { id: sponsorshipId, sponsorId: sponsor.id, status: 'APPROVED' },
  });
  if (!row) throw new HttpError(404, 'Approved sponsorship not found');
  return prisma.sponsorship.update({
    where: { id: sponsorshipId },
    data: { sponsorAcknowledged: true },
    include: { competition: true },
  });
}
