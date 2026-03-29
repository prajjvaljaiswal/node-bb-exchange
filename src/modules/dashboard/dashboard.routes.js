const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.get('/platform-admin', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.platformAdminDashboard);
router.get('/blood-bank/:bankId', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.bloodBankDashboard);

module.exports = router;
