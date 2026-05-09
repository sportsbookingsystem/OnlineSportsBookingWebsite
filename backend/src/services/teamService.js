import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export async function createTeam(userId, name) {
  return prisma.team.create({
    data: {
      name,
      creatorId: userId,
      members: { create: { userId } },
    },
    include: { members: { include: { user: true } } },
  });
}

export async function joinTeam(userId, teamId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new HttpError(404, 'Team not found');
  try {
    return await prisma.teamMember.create({
      data: { teamId, userId },
      include: { team: true },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      throw new HttpError(409, 'Already a member of this team');
    }
    throw e;
  }
}

export async function listMyTeams(userId) {
  return prisma.team.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { include: { role: true } } } },
    },
  });
}

export async function listAllTeams() {
  return prisma.team.findMany({
    include: {
      members: { include: { user: true } },
      creator: true,
    },
    orderBy: { id: 'asc' },
  });
}
