const { IS_DEV, mockMailTransporter } = require('./devMocks');

if (IS_DEV) {
  console.log('[DEV] Using mock mail transporter — emails will be logged to console');
  module.exports = mockMailTransporter;
} else {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  transporter.verify((error) => {
    if (error) {
      console.error('[mailer] SMTP connection failed:', error.message);
    } else {
      console.log('[mailer] SMTP ready');
    }
  });
  module.exports = transporter;
}
