import * as teamService from '../services/teamService.js';
import { validationResult } from 'express-validator';

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const team = await teamService.createTeam(req.user.id, req.body.name);
    res.status(201).json({ success: true, team });
  } catch (e) {
    next(e);
  }
}

export async function join(req, res, next) {
  try {
    await teamService.joinTeam(req.user.id, Number(req.params.teamId));
    res.json({ success: true, message: 'Joined team' });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req, res, next) {
  try {
    const teams = await teamService.listMyTeams(req.user.id);
    res.json({ success: true, teams });
  } catch (e) {
    next(e);
  }
}

export async function adminList(req, res, next) {
  try {
    const teams = await teamService.listAllTeams();
    res.json({ success: true, teams });
  } catch (e) {
    next(e);
  }
}
