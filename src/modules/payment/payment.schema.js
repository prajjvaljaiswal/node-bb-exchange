const { z } = require('zod');

const createOrder = z.object({
  paymentType: z.enum(['PATIENT_REGISTRATION', 'TRANSFER_FEE', 'CYCLE_REFUND', 'PRBC_FEE', 'SERVICE_CHARGE']),
  patientId: z.string().uuid().optional(),
  transferFormAId: z.string().uuid().optional(),
  donationEventId: z.string().uuid().optional(),
});

const verifyPayment = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  paymentId: z.string().uuid(), // our internal payment record ID
});

module.exports = { createOrder, verifyPayment };
