const express = require('express');
const router = express.Router();
const controller = require('./bloodBankGroup.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.post('/', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.createGroup);
router.get('/', authenticate, controller.listGroups);
router.get('/:id', authenticate, controller.getGroup);
router.post('/:id/members', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.addMember);
router.patch('/:id/members/:memberId/approve', authenticate, authorize(ROLES.BLOOD_BANK_ADMIN, ROLES.PLATFORM_ADMIN), controller.approveMember);
router.delete('/:id/members/:memberId', authenticate, controller.removeMember);
router.get('/:id/balance-sheets', authenticate, controller.getGroupBalanceSheets);
router.get('/:id/city-search', authenticate, controller.citySearch);

module.exports = router;
