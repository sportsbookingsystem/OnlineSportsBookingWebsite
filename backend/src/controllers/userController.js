import * as userService from '../services/userService.js';
import { validationResult } from 'express-validator';

export async function getProfile(req, res, next) {
  try {
    const profile = await userService.getProfile(req.user.id);
    res.json({ success: true, profile });
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const profile = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, profile });
  } catch (e) {
    next(e);
  }
}

export async function adminList(req, res, next) {
  try {
    const users = await userService.adminListUsers();
    res.json({ success: true, users });
  } catch (e) {
    next(e);
  }
}

export async function adminSetStatus(req, res, next) {
  try {
    const user = await userService.adminSetUserStatus(
      Number(req.params.id),
      req.body.status,
    );
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
}
