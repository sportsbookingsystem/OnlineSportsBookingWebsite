import * as facilityService from '../services/facilityService.js';
import { validationResult } from 'express-validator';

export async function listPublic(req, res, next) {
  try {
    const facilities = await facilityService.listPublicFacilities(req.query);
    res.json({ success: true, facilities });
  } catch (e) {
    next(e);
  }
}

export async function getOnePublic(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid facility id' });
    }
    const facility = await facilityService.getFacilityPublic(id);
    res.json({ success: true, facility });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req, res, next) {
  try {
    const facilities = await facilityService.listOwnerFacilities(req.user.id);
    res.json({ success: true, facilities });
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
    const facility = await facilityService.createFacility(req.user.id, req.body);
    res.status(201).json({ success: true, facility });
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const facility = await facilityService.updateFacility(
      req.user.id,
      Number(req.params.id),
      req.body,
    );
    res.json({ success: true, facility });
  } catch (e) {
    next(e);
  }
}

export async function addPhoto(req, res, next) {
  try {
    const photo = await facilityService.addFacilityPhoto(
      req.user.id,
      Number(req.params.id),
      req.body.url,
    );
    res.status(201).json({ success: true, photo });
  } catch (e) {
    next(e);
  }
}
