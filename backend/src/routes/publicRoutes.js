import { Router } from 'express';
import * as facilityController from '../controllers/facilityController.js';
import * as fieldController from '../controllers/fieldController.js';
import * as competitionController from '../controllers/competitionController.js';
import * as sponsorController from '../controllers/sponsorController.js';
import * as publicMetaController from '../controllers/publicMetaController.js';

const router = Router();

router.get('/sport-pricing', publicMetaController.sportPricing);
router.get('/facilities', facilityController.listPublic);
router.get('/facilities/:id', facilityController.getOnePublic);
router.get('/fields/:id', fieldController.getPublic);
router.get('/competitions', competitionController.listPublic);
router.get('/competitions/:id', competitionController.getOne);
router.get('/sponsors', sponsorController.listPublic);

export default router;
