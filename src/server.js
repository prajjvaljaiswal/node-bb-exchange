require('dotenv').config();
const http = require('http');
const cron = require('node-cron');
const app = require('./app');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`[server] Bloodexchange API running on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV}`);
  startCronJobs();
});

function startCronJobs() {
  // Nightly balance sheet PDF email — 23:59 IST
  cron.schedule('59 23 * * *', async () => {
    console.log('[cron] Running nightly balance sheet report');
    try {
      const prisma = require('./config/database');
      const reportService = require('./modules/report/report.service');
      const emailService = require('./services/email.service');
      const pdfService = require('./services/pdf.service');

      const activeBanks = await prisma.bloodBank.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      });

      for (const bank of activeBanks) {
        try {
          const entries = await reportService.receivablesReport({ bloodBankId: bank.id });
          const pdfBuffer = await pdfService.generateBalanceSheetReport(entries, 'receivables', {
            bloodBankId: bank.name,
            date: new Date().toLocaleDateString('en-IN'),
          });
          await emailService.sendDailyBalanceSheet(
            bank.email,
            bank.name,
            pdfBuffer,
            new Date().toLocaleDateString('en-IN')
          );
        } catch (e) {
          console.error(`[cron] Failed for bank ${bank.id}:`, e.message);
        }
      }
    } catch (err) {
      console.error('[cron] Nightly report failed:', err.message);
    }
  }, { timezone: process.env.REPORT_CRON_TIMEZONE || 'Asia/Kolkata' });

  console.log('[cron] Nightly balance sheet cron registered');

  // Module 2: "Alternatively after every 30 days ask the patient by sending a message again if the requirement status is active"
  // Run daily at 09:00 IST — checks patients active for exactly 30-day multiples
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Running 30-day patient re-engagement check');
    try {
      const prisma = require('./config/database');
      const emailService = require('./services/email.service');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find ACTIVE patients whose requirement was last updated ~30 days ago
      const patients = await prisma.patient.findMany({
        where: {
          status: 'ACTIVE',
          email: { not: null },
          updatedAt: { lte: thirtyDaysAgo },
        },
        select: { id: true, email: true, name: true, patientDisplayId: true },
        take: 200,
      });

      for (const patient of patients) {
        try {
          if (patient.email) {
            await emailService.sendPatientReEngagement(patient.email, patient.name, patient.patientDisplayId);
            // Touch updatedAt so they don't get pinged again immediately
            await prisma.patient.update({ where: { id: patient.id }, data: { updatedAt: new Date() } });
          }
        } catch (e) {
          console.error(`[cron] Re-engagement email failed for patient ${patient.id}:`, e.message);
        }
      }

      console.log(`[cron] Re-engagement emails sent to ${patients.length} patients`);
    } catch (err) {
      console.error('[cron] 30-day re-engagement cron failed:', err.message);
    }
  }, { timezone: process.env.REPORT_CRON_TIMEZONE || 'Asia/Kolkata' });

  console.log('[cron] 30-day patient re-engagement cron registered');
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err);
  server.close(() => process.exit(1));
});
