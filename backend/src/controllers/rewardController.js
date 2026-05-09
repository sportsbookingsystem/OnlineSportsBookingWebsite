import * as rewardService from '../services/rewardService.js';

export async function listMine(req, res, next) {
  try {
    const rewards = await rewardService.listRewardsForUser(req.user.id);
    res.json({ success: true, rewards });
  } catch (e) {
    next(e);
  }
}

export async function adminList(req, res, next) {
  try {
    const rewards = await rewardService.adminListRewards();
    res.json({ success: true, rewards });
  } catch (e) {
    next(e);
  }
}

export async function adminUpdateStatus(req, res, next) {
  try {
    const reward = await rewardService.adminUpdateRewardStatus(
      Number(req.params.id),
      req.body.status,
    );
    res.json({ success: true, reward });
  } catch (e) {
    next(e);
  }
}
