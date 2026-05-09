import { prisma } from '../config/database.js';

/** Competitions that have at least one match scheduled on this owner's fields. */
export async function listHostedCompetitions(ownerId) {
  const matches = await prisma.match.findMany({
    where: {
      competitionId: { not: null },
      field: { facility: { ownerId } },
    },
    include: {
      competition: true,
      field: { include: { facility: true } },
      homeTeam: true,
      awayTeam: true,
      result: true,
    },
    orderBy: { matchDate: 'desc' },
  });

  const byComp = new Map();
  for (const m of matches) {
    const c = m.competition;
    if (!c) continue;
    if (!byComp.has(c.id)) {
      byComp.set(c.id, { competition: c, matches: [] });
    }
    byComp.get(c.id).matches.push(m);
  }
  return Array.from(byComp.values());
}
