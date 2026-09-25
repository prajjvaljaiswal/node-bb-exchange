const express = require('express');
const router = express.Router();
const controller = require('./patient.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.post('/', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.createPatient);
router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN, ROLES.BLOOD_BANK_ADMIN), controller.listPatients);
router.get('/:id', authenticate, controller.getPatient);
router.post('/:id/confirm-registration', authenticate, controller.confirmRegistration);
router.get('/:id/recommendation', authenticate, controller.getRecommendation);
router.patch('/:id/fulfil', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.fulfilPatient);
router.patch('/:id', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.updatePatient);

module.exports = router;
