const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./inventory.schema');
const { ROLES } = require('../../config/constants');

const BA = authorize(ROLES.BLOOD_BANK_ADMIN);

// Whole Blood
router.get('/blood-banks/:bankId/whole-blood', authenticate, controller.listWholeBlood);
router.patch('/blood-banks/:bankId/whole-blood/:id/tti-results', authenticate, BA, validate(schema.ttiResults), controller.recordTTI);
router.patch('/blood-banks/:bankId/whole-blood/:id/separate', authenticate, BA, controller.separateBlood);

// PRBC
router.get('/blood-banks/:bankId/prbc', authenticate, controller.listPRBC);
router.get('/blood-banks/:bankId/prbc/summary', authenticate, controller.prbcSummary);

module.exports = router;
