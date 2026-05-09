import * as roleVerificationService from '../services/roleVerificationService.js';

function stripUser(u) {
  const { passwordHash: _p, ...rest } = u;
  return rest;
}

export async function listPending(req, res, next) {
  try {
    const users = await roleVerificationService.listPendingVerifications();
    res.json({
      success: true,
      pending: users.map((u) => stripUser(u)),
    });
  } catch (e) {
    next(e);
  }
}

export async function approve(req, res, next) {
  try {
    await roleVerificationService.applyRoleDecision(
      Number(req.params.userId),
      'approve',
    );
    res.json({ success: true, message: 'User approved' });
  } catch (e) {
    next(e);
  }
}

export async function reject(req, res, next) {
  try {
    await roleVerificationService.applyRoleDecision(
      Number(req.params.userId),
      'reject',
    );
    res.json({ success: true, message: 'User rejected' });
  } catch (e) {
    next(e);
  }
}
