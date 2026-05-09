import * as adminFacilityService from '../services/adminFacilityService.js';

export async function list(req, res, next) {
  try {
    const facilities = await adminFacilityService.adminListFacilities();
    res.json({ success: true, facilities });
  } catch (e) {
    next(e);
  }
}

export async function setActive(req, res, next) {
  try {
    const facility = await adminFacilityService.adminSetFacilityActive(
      Number(req.params.id),
      req.body.isActive,
    );
    res.json({ success: true, facility });
  } catch (e) {
    next(e);
  }
}
