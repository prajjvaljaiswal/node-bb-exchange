const express = require('express');
const router = express.Router();
const controller = require('./donor.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN, ROLES.BLOOD_BANK_ADMIN), controller.listDonors);
router.post('/', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.createDonor);

router.get('/:id', authenticate, controller.getDonor);
router.patch('/:id', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.updateDonor);
router.patch('/:id/auth-status', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.setDonorAuthStatus);

router.get('/:id/donor-cards', authenticate, controller.getDonorCards);
router.get('/:id/eligible-patients', authenticate, controller.getEligiblePatients);
router.post('/:id/select-patient', authenticate, authorize(ROLES.DONOR), controller.selectPatient);

module.exports = router;
