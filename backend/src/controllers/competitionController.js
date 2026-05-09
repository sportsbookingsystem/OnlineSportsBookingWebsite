import * as competitionService from '../services/competitionService.js';
import { validationResult } from 'express-validator';

export async function listPublic(req, res, next) {
  try {
    const competitions = await competitionService.listPublicCompetitions();
    res.json({ success: true, competitions });
  } catch (e) {
    next(e);
  }
}

export async function getOne(req, res, next) {
  try {
    const competition = await competitionService.getCompetition(
      Number(req.params.id),
    );
    res.json({ success: true, competition });
  } catch (e) {
    next(e);
  }
}

export async function listJoined(req, res, next) {
  try {
    const competitions = await competitionService.listJoinedCompetitions(
      req.user.id,
    );
    res.json({ success: true, competitions });
  } catch (e) {
    next(e);
  }
}

export async function applyToQualifiers(req, res, next) {
  try {
    await competitionService.applyToQualifiers(
      req.user.id,
      Number(req.body.teamId),
      Number(req.params.id),
    );
    res.json({
      success: true,
      message: 'Application submitted — an admin will review your team for qualifiers.',
    });
  } catch (e) {
    next(e);
  }
}

export async function adminListQualification(req, res, next) {
  try {
    const result = await competitionService.adminListQualificationTeams(
      Number(req.params.id),
    );
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
}

export async function adminApproveForQualifiers(req, res, next) {
  try {
    await competitionService.adminApproveForQualifiers(
      Number(req.params.id),
      Number(req.body.teamId),
    );
    res.json({ success: true, message: 'Team approved for qualifiers' });
  } catch (e) {
    next(e);
  }
}

export async function adminQualifyForMain(req, res, next) {
  try {
    await competitionService.adminQualifyForMain(
      Number(req.params.id),
      Number(req.body.teamId),
    );
    res.json({ success: true, message: 'Team qualified for main competition' });
  } catch (e) {
    next(e);
  }
}

export async function adminRejectQualification(req, res, next) {
  try {
    await competitionService.adminRejectQualificationApplication(
      Number(req.params.id),
      Number(req.body.teamId),
    );
    res.json({ success: true, message: 'Application rejected' });
  } catch (e) {
    next(e);
  }
}

export async function adminUpsert(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const isCreate = !req.params.id;
    const id = req.params.id ? Number(req.params.id) : req.body.id;
    const competition = await competitionService.adminUpsertCompetition({
      ...req.body,
      id,
    });
    res.status(isCreate ? 201 : 200).json({ success: true, competition });
  } catch (e) {
    next(e);
  }
}

export async function adminCreateMatch(req, res, next) {
  try {
    const match = await competitionService.adminCreateMatch(req.body);
    res.status(201).json({ success: true, match });
  } catch (e) {
    next(e);
  }
}

export async function adminRecordResult(req, res, next) {
  try {
    const match = await competitionService.adminRecordMatchResult(
      Number(req.params.matchId),
      Number(req.body.homeScore),
      Number(req.body.awayScore),
    );
    res.json({ success: true, match });
  } catch (e) {
    next(e);
  }
}
