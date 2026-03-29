const { IS_DEV, mockRazorpay } = require('./devMocks');

if (IS_DEV) {
  console.log('[DEV] Using mock Razorpay client');
  module.exports = mockRazorpay;
} else {
  const Razorpay = require('razorpay');
  module.exports = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}
