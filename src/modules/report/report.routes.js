const express = require('express');
const router = express.Router();
const controller = require('./report.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.get('/donations', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.donationsReport);
router.get('/balance-sheet/receivables', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.receivablesReport);
router.get('/balance-sheet/deliverables', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.deliverablesReport);
router.get('/transfers/physical', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.physicalTransferReport);
router.get('/transfers/digital', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN), controller.digitalTransferReport);

module.exports = router;
