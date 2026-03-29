const express = require('express');
const router = express.Router();
const controller = require('./payment.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./payment.schema');
const { ROLES } = require('../../config/constants');

router.post('/create-order', authenticate, validate(schema.createOrder), controller.createOrder);
router.post('/verify', authenticate, validate(schema.verifyPayment), controller.verifyPayment);
router.post('/webhook', controller.webhook);  // No auth — Razorpay webhook
router.get('/', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.listPayments);
router.post('/:id/refund', authenticate, authorize(ROLES.PLATFORM_ADMIN), controller.refund);

module.exports = router;
