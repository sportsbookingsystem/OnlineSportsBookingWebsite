import * as fieldService from '../services/fieldService.js';
import { validationResult } from 'express-validator';

export async function getPublic(req, res, next) {
  try {
    const field = await fieldService.getFieldPublic(Number(req.params.id));
    res.json({ success: true, field });
  } catch (e) {
    next(e);
  }
}

export async function create(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const field = await fieldService.createField(
      req.user.id,
      Number(req.params.facilityId),
      req.body,
    );
    res.status(201).json({ success: true, field });
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const field = await fieldService.updateField(
      req.user.id,
      Number(req.params.id),
      req.body,
    );
    res.json({ success: true, field });
  } catch (e) {
    next(e);
  }
}

export async function addImage(req, res, next) {
  try {
    const image = await fieldService.addFieldImage(
      req.user.id,
      Number(req.params.id),
      req.body.url,
    );
    res.status(201).json({ success: true, image });
  } catch (e) {
    next(e);
  }
}
