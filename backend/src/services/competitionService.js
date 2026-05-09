import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

/** Team–competition qualification pipeline (stored on competition_teams). */
export const QualificationStatus = {
  APPLIED: 'APPLIED',
  APPROVED_FOR_QUALIFIERS: 'APPROVED_FOR_QUALIFIERS',
  QUALIFIED: 'QUALIFIED',
  REJECTED: 'REJECTED',
};

const QS = QualificationStatus;

async function assertTeamMember(userId, teamId) {
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!m) throw new HttpError(403, 'You are not a member of this team');
}

async function countQualified(competitionId) {
  return prisma.competitionTeam.count({
    where: { competitionId, qualificationStatus: QS.QUALIFIED },
  });
}

function isMainDrawFull(comp, qualifiedCount) {
  return qualifiedCount >= comp.maxTeams;
}

export async function listPublicCompetitions() {
  return prisma.competition.findMany({
    where: { status: { in: ['OPEN', 'CLOSED', 'COMPLETED'] } },
    orderBy: { startDate: 'desc' },
    include: {
      sponsorships: {
        where: { status: 'APPROVED' },
        include: { sponsor: true },
      },
      teams: { include: { team: true } },
    },
  });
}

export async function getCompetition(id) {
  const c = await prisma.competition.findUnique({
    where: { id },
    include: {
      teams: { include: { team: { include: { members: true } } } },
      sponsorships: { include: { sponsor: true } },
      matches: {
        include: {
          homeTeam: true,
          awayTeam: true,
          result: true,
          field: true,
        },
      },
    },
  });
  if (!c) throw new HttpError(404, 'Competition not found');
  return {
    ...c,
    sponsorships: c.sponsorships.filter((s) => s.status === 'APPROVED'),
  };
}

export async function listJoinedCompetitions(userId) {
  const teams = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  const teamIds = teams.map((t) => t.teamId);
  if (teamIds.length === 0) return [];
  return prisma.competition.findMany({
    where: { teams: { some: { teamId: { in: teamIds } } } },
    include: {
      teams: { include: { team: true } },
      sponsorships: { where: { status: 'APPROVED' }, include: { sponsor: true } },
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function applyToQualifiers(userId, teamId, competitionId) {
  await assertTeamMember(userId, teamId);
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!comp) throw new HttpError(404, 'Competition not found');
  if (comp.status !== 'OPEN') {
    throw new HttpError(400, 'Competition is not open for applications');
  }
  const qualified = await countQualified(competitionId);
  if (isMainDrawFull(comp, qualified)) {
    throw new HttpError(400, 'Competition is full — no new applications');
  }

  const existing = await prisma.competitionTeam.findUnique({
    where: { competitionId_teamId: { competitionId, teamId } },
  });

  if (existing) {
    if (existing.qualificationStatus === QS.QUALIFIED) {
      throw new HttpError(409, 'Team is already qualified for the main competition');
    }
    if (existing.qualificationStatus === QS.APPROVED_FOR_QUALIFIERS) {
      throw new HttpError(
        409,
        'Team is approved for qualifiers — awaiting admin to mark as qualified',
      );
    }
    if (existing.qualificationStatus === QS.APPLIED) {
      throw new HttpError(409, 'Application already pending admin review');
    }
    if (existing.qualificationStatus === QS.REJECTED) {
      return prisma.competitionTeam.update({
        where: { id: existing.id },
        data: { qualificationStatus: QS.APPLIED },
      });
    }
  }

  try {
    return await prisma.competitionTeam.create({
      data: {
        competitionId,
        teamId,
        qualificationStatus: QS.APPLIED,
      },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      throw new HttpError(409, 'Team already has an application for this competition');
    }
    throw e;
  }
}

export async function adminListQualificationTeams(competitionId) {
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) throw new HttpError(404, 'Competition not found');
  const teams = await prisma.competitionTeam.findMany({
    where: { competitionId },
    include: { team: true },
    orderBy: { joinedAt: 'asc' },
  });
  const qualifiedCount = teams.filter((t) => t.qualificationStatus === QS.QUALIFIED)
    .length;
  return { competition: comp, teams, qualifiedCount };
}

export async function adminApproveForQualifiers(competitionId, teamId) {
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) throw new HttpError(404, 'Competition not found');
  const qualified = await countQualified(competitionId);
  if (isMainDrawFull(comp, qualified)) {
    throw new HttpError(400, 'Competition main draw is full');
  }
  const row = await prisma.competitionTeam.findUnique({
    where: { competitionId_teamId: { competitionId, teamId } },
  });
  if (!row) throw new HttpError(404, 'Team application not found');
  if (row.qualificationStatus !== QS.APPLIED) {
    throw new HttpError(400, 'Team is not in APPLIED status');
  }
  return prisma.competitionTeam.update({
    where: { id: row.id },
    data: { qualificationStatus: QS.APPROVED_FOR_QUALIFIERS },
  });
}

export async function adminQualifyForMain(competitionId, teamId) {
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) throw new HttpError(404, 'Competition not found');
  const qualified = await countQualified(competitionId);
  if (isMainDrawFull(comp, qualified)) {
    throw new HttpError(400, 'Main competition is full — cannot add more qualified teams');
  }
  const row = await prisma.competitionTeam.findUnique({
    where: { competitionId_teamId: { competitionId, teamId } },
  });
  if (!row) throw new HttpError(404, 'Team application not found');
  if (row.qualificationStatus !== QS.APPROVED_FOR_QUALIFIERS) {
    throw new HttpError(400, 'Team must be approved for qualifiers first');
  }
  return prisma.competitionTeam.update({
    where: { id: row.id },
    data: { qualificationStatus: QS.QUALIFIED },
  });
}

export async function adminRejectQualificationApplication(competitionId, teamId) {
  const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
  if (!comp) throw new HttpError(404, 'Competition not found');
  const row = await prisma.competitionTeam.findUnique({
    where: { competitionId_teamId: { competitionId, teamId } },
  });
  if (!row) throw new HttpError(404, 'Team application not found');
  if (
    row.qualificationStatus !== QS.APPLIED &&
    row.qualificationStatus !== QS.APPROVED_FOR_QUALIFIERS
  ) {
    throw new HttpError(400, 'Only pending applications can be rejected');
  }
  return prisma.competitionTeam.update({
    where: { id: row.id },
    data: { qualificationStatus: QS.REJECTED },
  });
}

function pickDefined(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export async function adminUpsertCompetition(data) {
  if (data.id) {
    const patch = pickDefined(data, [
      'name',
      'description',
      'sportType',
      'maxTeams',
      'startDate',
      'endDate',
      'status',
    ]);
    return prisma.competition.update({
      where: { id: data.id },
      data: patch,
    });
  }
  return prisma.competition.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      status: data.status || 'DRAFT',
      ...pickDefined(data, ['sportType', 'maxTeams']),
    },
  });
}

export async function adminCreateMatch(data) {
  return prisma.match.create({
    data: {
      competitionId: data.competitionId || null,
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      fieldId: data.fieldId || null,
      matchDate: new Date(data.matchDate),
      status: data.status || 'scheduled',
    },
  });
}

export async function adminRecordMatchResult(matchId, homeScore, awayScore) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { result: true },
  });
  if (!match) throw new HttpError(404, 'Match not found');
  if (match.result) throw new HttpError(400, 'Result already recorded');

  let winnerId = null;
  if (homeScore > awayScore) winnerId = match.homeTeamId;
  else if (awayScore > homeScore) winnerId = match.awayTeamId;

  await prisma.$transaction([
    prisma.matchResult.create({
      data: {
        matchId,
        homeScore,
        awayScore,
        winnerId,
      },
    }),
    prisma.match.update({
      where: { id: matchId },
      data: { status: 'played' },
    }),
  ]);

  if (winnerId && match.competitionId) {
    const { createRewardForWinningTeam } = await import('./rewardService.js');
    await createRewardForWinningTeam({
      competitionId: match.competitionId,
      winnerTeamId: winnerId,
    });
  }

  return prisma.match.findUnique({
    where: { id: matchId },
    include: { result: true, homeTeam: true, awayTeam: true },
  });
}
