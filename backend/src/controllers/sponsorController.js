import * as sponsorService from '../services/sponsorService.js';
import { validationResult } from 'express-validator';

export async function listPublic(req, res, next) {
  try {
    const sponsors = await sponsorService.listSponsorsPublic();
    res.json({ success: true, sponsors });
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const sponsor = await sponsorService.updateSponsorProfile(
      req.user.id,
      req.body,
    );
    res.json({ success: true, sponsor });
  } catch (e) {
    next(e);
  }
}

export async function getMySponsorRow(req, res, next) {
  try {
    const sponsor = await sponsorService.getSponsorProfileRow(req.user.id);
    res.json({ success: true, sponsor });
  } catch (e) {
    next(e);
  }
}

export async function createSponsorship(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const offer = await sponsorService.createOffer(req.user.id, req.body);
    res.status(201).json({ success: true, offer });
  } catch (e) {
    next(e);
  }
}

export async function listMine(req, res, next) {
  try {
    const offers = await sponsorService.listMySponsorships(req.user.id);
    res.json({ success: true, offers });
  } catch (e) {
    next(e);
  }
}

export async function adminSetStatus(req, res, next) {
  try {
    const row = await sponsorService.adminSetSponsorshipStatus(
      Number(req.params.id),
      req.body.status,
    );
    res.json({ success: true, sponsorship: row });
  } catch (e) {
    next(e);
  }
}

export async function analytics(req, res, next) {
  try {
    const rows = await sponsorService.getSponsorAnalytics(req.user.id);
    res.json({ success: true, analytics: rows });
  } catch (e) {
    next(e);
  }
}

export async function updateOfferAd(req, res, next) {
  try {
    const row = await sponsorService.updateSponsorshipAd(
      req.user.id,
      Number(req.params.id),
      req.body,
    );
    res.json({ success: true, sponsorship: row });
  } catch (e) {
    next(e);
  }
}

export async function acknowledgeOffer(req, res, next) {
  try {
    const row = await sponsorService.acknowledgeSponsorship(
      req.user.id,
      Number(req.params.id),
    );
    res.json({ success: true, sponsorship: row });
  } catch (e) {
    next(e);
  }
}
