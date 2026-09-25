const express = require('express');
const router = express.Router();
const controller = require('./bloodBank.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN, ROLES.BLOOD_BANK_ADMIN, ROLES.DONOR), controller.listBanks);
router.get('/:id', authenticate, controller.getBank);
router.patch('/:id/approve', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.approveBank);
router.patch('/:id/suspend', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.suspendBank);
router.patch('/:id', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.updateBank);

router.get('/:id/admins', authenticate, controller.listAdmins);
router.post('/:id/admins', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.createAdmin);
router.patch('/:id/admins/:adminId/auth-status', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.updateAdminStatus);
router.delete('/:id/admins/:adminId', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.deleteAdmin);

module.exports = router;
