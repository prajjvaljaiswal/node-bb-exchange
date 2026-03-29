const express = require('express');
const router = express.Router();
const controller = require('./patient.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./patient.schema');
const { ROLES } = require('../../config/constants');

router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN, ROLES.BLOOD_BANK_ADMIN), controller.listPatients);
router.get('/:id', authenticate, controller.getPatient);
router.post('/:id/confirm-registration', authenticate, controller.confirmRegistration);
router.get('/:id/recommendation', authenticate, controller.getRecommendation);
router.patch('/:id/fulfil', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.fulfilPatient);

module.exports = router;
