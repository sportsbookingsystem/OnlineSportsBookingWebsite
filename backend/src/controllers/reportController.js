import * as adminStatsService from '../services/adminStatsService.js';
import * as revenueService from '../services/revenueService.js';

export async function adminDashboard(req, res, next) {
  try {
    const stats = await adminStatsService.getAdminDashboardStats();
    res.json({ success: true, stats });
  } catch (e) {
    next(e);
  }
}

export async function ownerRevenue(req, res, next) {
  try {
    const summary = await revenueService.ownerRevenueSummary(req.user.id);
    res.json({ success: true, summary });
  } catch (e) {
    next(e);
  }
}
