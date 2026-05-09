import * as notificationService from '../services/notificationService.js';

export async function listMine(req, res, next) {
  try {
    const notifications = await notificationService.listMyNotifications(
      req.user.id,
    );
    res.json({ success: true, notifications });
  } catch (e) {
    next(e);
  }
}
