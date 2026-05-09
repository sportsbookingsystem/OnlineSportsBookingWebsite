import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';
import { hashPassword } from '../utils/password.js';

export async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) throw new HttpError(404, 'User not found');
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function updateProfile(userId, { name, phone, password }) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (password) {
    data.passwordHash = await hashPassword(password);
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: { role: true },
  });
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function adminListUsers() {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { id: 'asc' },
  });
  return users.map(({ passwordHash: _p, ...rest }) => rest);
}

export async function adminSetUserStatus(userId, status) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    include: { role: true },
  });
  const { passwordHash: _p, ...rest } = user;
  return rest;
}
