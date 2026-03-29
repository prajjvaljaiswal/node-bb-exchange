const service = require('./payment.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');

async function createOrder(req, res, next) {
  try {
    const result = await service.createOrder(req.body, req.user.id);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function verifyPayment(req, res, next) {
  try {
    const payment = await service.verifyPayment(req.body);
    sendSuccess(res, payment);
  } catch (err) { next(err); }
}

async function webhook(req, res, next) {
  try {
    const sig = req.headers['x-razorpay-signature'];
    await service.processWebhook(req.body, sig);
    res.json({ received: true });
  } catch (err) { next(err); }
}

async function listPayments(req, res, next) {
  try {
    const result = await service.listPayments(req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function refund(req, res, next) {
  try {
    const payment = await service.refund(req.params.id);
    sendSuccess(res, payment);
  } catch (err) { next(err); }
}

module.exports = { createOrder, verifyPayment, webhook, listPayments, refund };
