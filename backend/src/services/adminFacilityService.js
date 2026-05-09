import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export async function adminListFacilities() {
  return prisma.facility.findMany({
    include: {
      owner: { include: { role: true } },
      fields: true,
      photos: true,
    },
    orderBy: { id: 'asc' },
  });
}

export async function adminSetFacilityActive(id, isActive) {
  const f = await prisma.facility.findUnique({ where: { id } });
  if (!f) throw new HttpError(404, 'Facility not found');
  return prisma.facility.update({
    where: { id },
    data: { isActive },
  });
}
