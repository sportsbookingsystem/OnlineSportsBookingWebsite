import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export async function applyRoleDecision(userId, action) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  if (!['FACILITY_OWNER', 'SPONSOR'].includes(user.role.name)) {
    throw new HttpError(
      400,
      'This account does not require this verification step',
    );
  }
  if (user.roleVerificationStatus !== 'PENDING') {
    throw new HttpError(
      400,
      `This request was already processed (status: ${user.roleVerificationStatus})`,
    );
  }

  if (action === 'approve') {
    await prisma.user.update({
      where: { id: userId },
      data: { roleVerificationStatus: 'APPROVED' },
    });
    return { status: 'APPROVED' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { roleVerificationStatus: 'REJECTED' },
  });
  return { status: 'REJECTED' };
}

export async function listPendingVerifications() {
  return prisma.user.findMany({
    where: {
      role: { name: { in: ['FACILITY_OWNER', 'SPONSOR'] } },
      roleVerificationStatus: 'PENDING',
    },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  });
}
