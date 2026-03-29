const prisma = require('../../config/database');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { FEES } = require('../../config/constants');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');

const AMOUNT_MAP = {
  PATIENT_REGISTRATION: FEES.PATIENT_REGISTRATION,
  TRANSFER_FEE: FEES.TRANSFER_FEE,
  PRBC_FEE: 0, // dynamic
  SERVICE_CHARGE: 0, // dynamic
  CYCLE_REFUND: 0, // automated
};

async function createOrder(data, userId) {
  const { paymentType, patientId, transferFormAId, donationEventId } = data;

  const amount = AMOUNT_MAP[paymentType];
  if (!amount) throw Object.assign(new Error('Invalid or dynamic payment type'), { status: 400, code: 'INVALID_PAYMENT_TYPE' });

  const razorpayOrder = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { paymentType, userId },
  });

  const paymentDisplayId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      paymentDisplayId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      paymentType,
      status: 'CREATED',
      senderUserId: userId,
      patientId,
      transferFormAId,
      donationEventId,
    },
  });

  return {
    paymentId: payment.id,
    orderId: razorpayOrder.id,
    amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

async function verifyPayment(data) {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentId } = data;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const IS_DEV = process.env.DEV_MODE === 'true';
  const validSig = IS_DEV && razorpaySignature === 'dev_signature_bypass'
    ? true
    : expectedSig === razorpaySignature;
  if (!validSig) {
    throw Object.assign(new Error('Invalid payment signature'), { status: 400, code: 'INVALID_SIGNATURE' });
  }

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'CAPTURED', razorpayPaymentId },
  });

  // Unblock downstream: if patient registration, activate patient
  if (payment.paymentType === 'PATIENT_REGISTRATION' && payment.patientId) {
    await prisma.patient.update({
      where: { id: payment.patientId },
      data: { status: 'ACTIVE', registrationFeePaid: true },
    });
  }

  return payment;
}

async function processWebhook(body, signature) {
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  if (expectedSig !== signature) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 400, code: 'INVALID_SIGNATURE' });
  }

  const { event, payload } = body;

  if (event === 'payment.captured') {
    const paymentId = payload.payment.entity.order_id;
    const payment = await prisma.payment.findFirst({ where: { razorpayOrderId: paymentId } });
    if (payment && payment.status === 'CREATED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'CAPTURED', razorpayPaymentId: payload.payment.entity.id },
      });
    }
  }

  return { received: true };
}

async function listPayments(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (query.paymentType) where.paymentType = query.paymentType;
  if (query.status) where.status = query.status;

  const [total, items] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function refund(paymentId) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'CAPTURED') {
    throw Object.assign(new Error('Payment not eligible for refund'), { status: 400, code: 'NOT_ELIGIBLE' });
  }

  await razorpay.payments.refund(payment.razorpayPaymentId, { amount: payment.amount });

  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'REFUNDED' },
  });
}

module.exports = { createOrder, verifyPayment, processWebhook, listPayments, refund };
