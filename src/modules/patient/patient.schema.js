const { z } = require('zod');

const confirmRegistration = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

module.exports = { confirmRegistration };
