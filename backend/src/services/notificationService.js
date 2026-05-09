import { prisma } from '../config/database.js';

export async function listMyNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function notifyUser(userId, title, body) {
  return prisma.notification.create({
    data: { userId, title, body },
  });
}
