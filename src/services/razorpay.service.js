const { IS_DEV } = require('../config/devMocks');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');

async function createOrder(amount, currency = 'INR', receipt, notes = {}) {
  return razorpay.orders.create({ amount, currency, receipt, notes });
}

function verifySignature(orderId, paymentId, signature) {
  if (IS_DEV) {
    // In dev mode, accept the magic dev signature or any signature matching pattern
    if (signature === 'dev_signature_bypass') return true;
    // Also accept real verification for testing
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

async function issueRefund(paymentId, amount) {
  return razorpay.payments.refund(paymentId, { amount, speed: 'normal' });
}

async function fetchPayment(paymentId) {
  return razorpay.payments.fetch(paymentId);
}

module.exports = { createOrder, verifySignature, issueRefund, fetchPayment };
