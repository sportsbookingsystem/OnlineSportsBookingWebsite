import { prisma } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../config/jwt.js';
import { HttpError } from '../utils/httpError.js';

/** Public registration only — ADMIN is never created here (only seeded / DB ops). */
const ROLE_MAP = {
  player: 'PLAYER',
  facility_owner: 'FACILITY_OWNER',
  sponsor: 'SPONSOR',
};

export async function register({
  email,
  password,
  name,
  phone,
  roleKey,
  companyName,
}) {
  const roleName = ROLE_MAP[roleKey];
  if (!roleName) throw new HttpError(400, 'Invalid role');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'Email already registered');

  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) throw new HttpError(500, 'Roles not seeded — run npm run db:seed');

  const needsVerification =
    roleName === 'FACILITY_OWNER' || roleName === 'SPONSOR';
  const roleVerificationStatus = needsVerification ? 'PENDING' : 'APPROVED';

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      phone: phone || null,
      roleId: role.id,
      roleVerificationStatus,
    },
    include: { role: true },
  });

  if (roleName === 'SPONSOR') {
    await prisma.sponsor.create({
      data: {
        userId: user.id,
        companyName:
          (companyName && String(companyName).trim()) || `${name}'s company`,
      },
    });
  }

  if (needsVerification) {
    return {
      user: sanitizeUser(user),
      pendingVerification: true,
      message: 'Your account is pending admin approval.',
    };
  }

  const token = signToken({ sub: user.id, role: user.role.name });
  return { user: sanitizeUser(user), token };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user) throw new HttpError(401, 'Invalid credentials');
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
  if (user.status !== 'ACTIVE') {
    throw new HttpError(403, 'Account suspended or blocked');
  }
  // FACILITY_OWNER / SPONSOR may be PENDING or REJECTED — they still get a session so the app can
  // show status on the dashboard. Owner/sponsor APIs remain gated by requireApprovedRoleVerification.
  const token = signToken({ sub: user.id, role: user.role.name });
  return { user: sanitizeUser(user), token };
}

export function sanitizeUser(user) {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}
