const express = require('express');
const router = express.Router();
const controller = require('./bloodBank.controller');
const { authenticate, authorize, requireEmailVerified } = require('../../middleware/auth');
const { validate, validateQuery } = require('../../middleware/validate');
const schema = require('./bloodBank.schema');
const { ROLES } = require('../../config/constants');

// Public — self registration (POST /api/v1/blood-banks is actually handled via auth register)
// Platform admin routes
router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.listBanks);
router.get('/:id', authenticate, controller.getBank);
router.patch('/:id/approve', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.approveBank);
router.patch('/:id/suspend', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.suspendBank);
router.patch('/:id', authenticate, authorize(ROLES.PLATFORM_ADMIN), validate(schema.updateBank), controller.updateBank);

// Admin management (blood bank admin manages their own bank's admins)
router.get('/:id/admins', authenticate, controller.listAdmins);
router.post('/:id/admins', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), validate(schema.createAdmin), controller.createAdmin);
router.patch('/:id/admins/:adminId/auth-status', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), validate(schema.updateAdminStatus), controller.updateAdminStatus);
router.delete('/:id/admins/:adminId', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.deleteAdmin);

module.exports = router;
