/**
 * Authentication & role-based authorization
 *
 * authenticate: verifies JWT from `Authorization: Bearer <token>`,
 * loads the user from DB, blocks SUSPENDED/BLOCKED accounts.
 *
 * requireRole(...roles): express middleware factory — use AFTER authenticate.
 * Compares req.user.role.name against allowed role name strings.
 */
import { verifyToken } from '../config/jwt.js';
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required');
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { role: true },
    });
    if (!user) throw new HttpError(401, 'Invalid session');
    if (user.status !== 'ACTIVE') {
      throw new HttpError(403, 'Account is not active');
    }
    req.user = user;
    next();
  } catch (e) {
    next(
      e instanceof HttpError
        ? e
        : new HttpError(401, 'Invalid or expired token'),
    );
  }
}

/** @param {('PLAYER'|'FACILITY_OWNER'|'SPONSOR'|'ADMIN')[]} roles */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role.name)) {
      return next(new HttpError(403, 'Insufficient permissions'));
    }
    next();
  };
}

/**
 * Facility owners and sponsors must be admin-approved before using elevated APIs.
 * Call after authenticate + requireRole('FACILITY_OWNER' | 'SPONSOR').
 */
export function requireApprovedRoleVerification(req, _res, next) {
  if (!req.user) {
    return next(new HttpError(401, 'Authentication required'));
  }
  if (req.user.roleVerificationStatus !== 'APPROVED') {
    return next(
      new HttpError(
        403,
        'Your account is not approved to use owner or sponsor features yet.',
      ),
    );
  }
  next();
}
