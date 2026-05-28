const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

router.post('/create-order', authenticate, controller.createOrder);
router.post('/verify', authenticate, controller.verifyPayment);
router.post('/webhook', controller.webhook);
router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.listPayments);
router.post('/:id/refund', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.refund);

module.exports = router;
