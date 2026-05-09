import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

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

export async function joinCompetition(teamId, competitionId) {
  const comp = await prisma.competition.findUnique({
    where: { id: competitionId },
  });
  if (!comp) throw new HttpError(404, 'Competition not found');
  if (comp.status !== 'OPEN') {
    throw new HttpError(400, 'Competition is not open for joining');
  }
  try {
    return await prisma.competitionTeam.create({
      data: { competitionId, teamId },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      throw new HttpError(409, 'Team already enrolled');
    }
    throw e;
  }
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
