const transporter = require('../config/nodemailer');

const FROM = process.env.EMAIL_FROM || 'Bloodexchange.in <noreply@bloodexchange.in>';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function send(to, subject, html) {
  await transporter.sendMail({ from: FROM, to, subject, html });
}

function brandedHtml(title, bodyHtml) {
  return `
  <!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f7f4ef; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #B91C1C; padding: 24px 32px; color: #fff; }
    .header h1 { margin: 0; font-size: 22px; }
    .body { padding: 32px; color: #1A1614; }
    .btn { display: inline-block; background: #B91C1C; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
    .footer { padding: 16px 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
    code { font-family: 'JetBrains Mono', monospace; background: #f0ede8; padding: 2px 6px; border-radius: 3px; }
  </style></head><body>
  <div class="wrap">
    <div class="header"><h1>Bloodexchange.in</h1><p style="margin:4px 0 0;opacity:0.85">${title}</p></div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">Bloodexchange.in — India's paperless blood exchange network.<br>This is an automated email. Please do not reply.</div>
  </div></body></html>`;
}

async function sendEmailVerification(email, name, token) {
  const link = `${BASE_URL}/verify-email?token=${token}`;
  await send(email, 'Verify your Bloodexchange.in email', brandedHtml('Email Verification',
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Thank you for registering. Please verify your email to activate your account.</p>
     <a class="btn" href="${link}">Verify Email</a>
     <p>Or copy this link: <code>${link}</code></p>
     <p>This link expires in 24 hours.</p>`
  ));
}

async function sendPasswordReset(email, token) {
  const link = `${BASE_URL}/reset-password?token=${token}`;
  await send(email, 'Reset your Bloodexchange.in password', brandedHtml('Password Reset',
    `<p>You requested a password reset. Click below to set a new password:</p>
     <a class="btn" href="${link}">Reset Password</a>
     <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`
  ));
}

async function sendWelcomeDonor(email, name) {
  await send(email, 'Welcome to Bloodexchange.in', brandedHtml('Welcome, Donor!',
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Thank you for joining Bloodexchange.in. Your donation can save lives across India.</p>
     <a class="btn" href="${BASE_URL}/donor/dashboard">Go to Dashboard</a>`
  ));
}

async function sendWelcomeBloodBank(email, bankName) {
  await send(email, 'Welcome to Bloodexchange.in', brandedHtml('Blood Bank Registered',
    `<p>Dear <strong>${bankName}</strong>,</p>
     <p>Your blood bank registration has been submitted and is under review by the platform admin. You will be notified upon approval.</p>`
  ));
}

async function sendDonationConfirmation(email, donorName, donorCardId, patientName) {
  await send(email, 'Donation Confirmed — Bloodexchange.in', brandedHtml('Donation Recorded',
    `<p>Hi <strong>${donorName}</strong>,</p>
     <p>Your donation has been recorded. Donor Card: <code>${donorCardId}</code></p>
     <p>Patient: <strong>${patientName || 'Unknown'}</strong></p>
     <p>Thank you for your contribution to India's blood exchange network.</p>`
  ));
}

async function sendCycleRefundNotice(email, name, refundAmount, cycleDetails) {
  await send(email, 'Cycle Detected — Refund Issued', brandedHtml('Cycle Exchange Completed',
    `<p>Hi <strong>${name}</strong>,</p>
     <p>A donation cycle has been detected and settled. You are eligible for a refund of <strong>&#8377;${refundAmount / 100}</strong>.</p>
     <p>Cycle path: <code>${cycleDetails}</code></p>
     <p>The refund will be credited to your registered bank account within 3-5 business days.</p>`
  ));
}

async function sendDailyBalanceSheet(email, bankName, pdfBuffer, date) {
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Daily Balance Sheet — ${bankName} — ${date}`,
    html: brandedHtml('Daily Balance Sheet',
      `<p>Dear <strong>${bankName}</strong>,</p>
       <p>Please find attached your daily balance sheet for <strong>${date}</strong>.</p>`
    ),
    attachments: [{
      filename: `balance-sheet-${date}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

async function sendTransferFormANotification(email, bankName, formDisplayId, bloodGroup, units) {
  await send(email, `Transfer Request Received — ${formDisplayId}`, brandedHtml('Transfer Form A',
    `<p>Dear <strong>${bankName}</strong>,</p>
     <p>A transfer request has been received: <code>${formDisplayId}</code></p>
     <p>Blood Group: <strong>${bloodGroup}</strong> — Units: <strong>${units}</strong></p>
     <a class="btn" href="${BASE_URL}/blood-bank/transfers/form-a">View Request</a>`
  ));
}

async function sendFormBDispatchNotification(email, bankName, formDisplayId, dispatchDate) {
  await send(email, `Blood Dispatched — ${formDisplayId}`, brandedHtml('Transfer Form B — Dispatch',
    `<p>Dear <strong>${bankName}</strong>,</p>
     <p>Blood units have been dispatched under Form B: <code>${formDisplayId}</code></p>
     <p>Dispatch Date: <strong>${dispatchDate}</strong></p>
     <a class="btn" href="${BASE_URL}/blood-bank/transfers/form-b">View Details</a>`
  ));
}

module.exports = {
  sendEmailVerification,
  sendPasswordReset,
  sendWelcomeDonor,
  sendWelcomeBloodBank,
  sendDonationConfirmation,
  sendCycleRefundNotice,
  sendDailyBalanceSheet,
  sendTransferFormANotification,
  sendFormBDispatchNotification,
};
