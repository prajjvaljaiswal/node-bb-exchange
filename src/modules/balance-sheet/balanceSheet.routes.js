const express = require('express');
const router = express.Router();
const controller = require('./balanceSheet.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.get('/blood-banks/:bankId/receivables', authenticate, controller.receivables);
router.get('/blood-banks/:bankId/deliverables', authenticate, controller.deliverables);
router.get('/blood-banks/:bankId/summary', authenticate, controller.summary);
router.get('/blood-banks/:bankId/neighbours', authenticate, controller.neighbours);

module.exports = router;
