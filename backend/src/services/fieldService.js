import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export async function createField(ownerId, facilityId, data) {
  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, ownerId },
  });
  if (!facility) throw new HttpError(404, 'Facility not found');

  const field = await prisma.field.create({
    data: {
      facilityId,
      name: data.name,
      sportType: data.sportType,
      description: data.description,
      pricePerSlot: data.pricePerSlot != null ? data.pricePerSlot : 0,
      locationNote: data.locationNote,
      openingHoursJson: data.openingHoursJson ?? null,
      images: data.imageUrls?.length
        ? {
            create: data.imageUrls.map((url, i) => ({
              url,
              sortOrder: i,
            })),
          }
        : undefined,
      slots: data.slots?.length
        ? {
            create: data.slots.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          }
        : undefined,
    },
    include: { images: true, slots: true },
  });
  return field;
}

export async function updateField(ownerId, fieldId, data) {
  const field = await prisma.field.findFirst({
    where: { id: fieldId, facility: { ownerId } },
    include: { facility: true },
  });
  if (!field) throw new HttpError(404, 'Field not found');

  if (data.slots) {
    await prisma.availabilitySlot.deleteMany({ where: { fieldId } });
    await prisma.availabilitySlot.createMany({
      data: data.slots.map((s) => ({
        fieldId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  }

  return prisma.field.update({
    where: { id: fieldId },
    data: {
      name: data.name,
      sportType: data.sportType,
      description: data.description,
      pricePerSlot:
        data.pricePerSlot !== undefined ? data.pricePerSlot : undefined,
      locationNote: data.locationNote,
      openingHoursJson: data.openingHoursJson,
      isActive: data.isActive,
    },
    include: { images: true, slots: true },
  });
}

export async function addFieldImage(ownerId, fieldId, url) {
  const field = await prisma.field.findFirst({
    where: { id: fieldId, facility: { ownerId } },
  });
  if (!field) throw new HttpError(404, 'Field not found');
  const agg = await prisma.fieldImage.aggregate({
    where: { fieldId },
    _max: { sortOrder: true },
  });
  const nextOrder = (agg._max.sortOrder ?? -1) + 1;
  return prisma.fieldImage.create({
    data: { fieldId, url, sortOrder: nextOrder },
  });
}

export async function getFieldPublic(fieldId) {
  const field = await prisma.field.findFirst({
    where: { id: fieldId, isActive: true, facility: { isActive: true } },
    include: {
      facility: { include: { photos: true } },
      images: true,
      slots: true,
    },
  });
  if (!field) throw new HttpError(404, 'Field not found');
  return field;
}
