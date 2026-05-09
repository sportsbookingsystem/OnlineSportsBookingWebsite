import * as ownerCompetitionService from '../services/ownerCompetitionService.js';

export async function listHosted(req, res, next) {
  try {
    const hosted = await ownerCompetitionService.listHostedCompetitions(
      req.user.id,
    );
    res.json({ success: true, hosted });
  } catch (e) {
    next(e);
  }
}
