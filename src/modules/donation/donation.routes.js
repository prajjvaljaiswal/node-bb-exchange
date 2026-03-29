const express = require('express');
const router = express.Router();
const controller = require('./donation.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./donation.schema');
const { ROLES } = require('../../config/constants');

router.post('/', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), validate(schema.createDonation), controller.createDonation);
router.get('/', authenticate, controller.listDonations);
router.get('/:id', authenticate, controller.getDonation);

module.exports = router;
