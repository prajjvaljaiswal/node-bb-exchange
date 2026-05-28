const express = require('express');
const router = express.Router();
const controller = require('./donation.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.post('/', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.createDonation);
router.get('/', authenticate, controller.listDonations);
router.get('/:id', authenticate, controller.getDonation);

module.exports = router;
