import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

/** Express `req.query` values are strings; duplicate keys become arrays — Prisma needs a single string. */
function firstQueryString(val) {
  if (val === undefined || val === null) return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  if (raw === '' || raw === undefined) return undefined;
  return typeof raw === 'string' ? raw.trim() : String(raw).trim();
}

function firstQueryNumber(val) {
  const s = firstQueryString(val);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function listPublicFacilities(filters) {
  const sport = firstQueryString(filters.sport);
  const city = firstQueryString(filters.city);
  const search = firstQueryString(filters.search);
  const maxPrice = firstQueryNumber(filters.maxPrice);

  // SQLite: no `mode: 'insensitive'` on string filters — use plain equals / contains.
  return prisma.facility.findMany({
    where: {
      isActive: true,
      ...(city ? { city: { contains: city } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
      ...(sport !== undefined || maxPrice !== undefined
        ? {
            fields: {
              some: {
                isActive: true,
                ...(sport !== undefined ? { sportType: { equals: sport } } : {}),
                ...(maxPrice !== undefined ? { pricePerSlot: { lte: maxPrice } } : {}),
              },
            },
          }
        : {}),
    },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      fields: {
        where: { isActive: true },
        include: { images: { take: 1 } },
      },
    },
  });
}

export async function getFacilityPublic(id) {
  const f = await prisma.facility.findFirst({
    where: { id, isActive: true },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      fields: {
        where: { isActive: true },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          slots: true,
        },
      },
    },
  });
  if (!f) throw new HttpError(404, 'Facility not found');
  return f;
}

export async function createFacility(ownerId, data) {
  return prisma.facility.create({
    data: {
      ownerId,
      name: data.name,
      description: data.description,
      address: data.address,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      approvalRequired: data.approvalRequired ?? false,
      photos: data.photoUrls?.length
        ? {
            create: data.photoUrls.map((url, i) => ({
              url,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { photos: true, fields: true },
  });
}

export async function updateFacility(ownerId, facilityId, data) {
  const f = await prisma.facility.findFirst({
    where: { id: facilityId, ownerId },
  });
  if (!f) throw new HttpError(404, 'Facility not found');
  return prisma.facility.update({
    where: { id: facilityId },
    data: {
      name: data.name,
      description: data.description,
      address: data.address,
      city: data.city,
      lat: data.lat,
      lng: data.lng,
      approvalRequired: data.approvalRequired,
      isActive: data.isActive,
    },
  });
}

export async function listOwnerFacilities(ownerId) {
  return prisma.facility.findMany({
    where: { ownerId },
    include: {
      photos: true,
      fields: { include: { images: true, slots: true } },
    },
    orderBy: { id: 'asc' },
  });
}

export async function addFacilityPhoto(ownerId, facilityId, url) {
  const f = await prisma.facility.findFirst({
    where: { id: facilityId, ownerId },
  });
  if (!f) throw new HttpError(404, 'Facility not found');
  return prisma.facilityPhoto.create({
    data: { facilityId, url },
  });
}
