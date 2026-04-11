const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { globalLimiter, authLimiter, paymentsLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const auditLog = require('./middleware/auditLog');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const bloodBankRoutes = require('./modules/blood-bank/bloodBank.routes');
const bloodBankGroupRoutes = require('./modules/blood-bank-group/bloodBankGroup.routes');
const donorRoutes = require('./modules/donor/donor.routes');
const patientRoutes = require('./modules/patient/patient.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const donationRoutes = require('./modules/donation/donation.routes');
const balanceSheetRoutes = require('./modules/balance-sheet/balanceSheet.routes');
const transferRoutes = require('./modules/transfer/transfer.routes');
const digitalExchangeRoutes = require('./modules/digital-exchange/digitalExchange.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const reportRoutes = require('./modules/report/report.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const recommendationRoutes = require('./modules/recommendation/recommendation.routes');

const app = express();

// Trust the first proxy hop so express-rate-limit can read X-Forwarded-For correctly
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global rate limiter
app.use('/api/', globalLimiter);

// Auth routes (with stricter rate limiter)
app.use('/api/v1/auth', authLimiter);

// Payment routes rate limiter
app.use('/api/v1/payments', paymentsLimiter);

// Audit log for mutating requests
app.use(auditLog);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blood-banks', bloodBankRoutes);
app.use('/api/v1/blood-bank-groups', bloodBankGroupRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/donations', donationRoutes);
app.use('/api/v1/balance-sheet', balanceSheetRoutes);
app.use('/api/v1/transfers', transferRoutes);
app.use('/api/v1/digital-exchange', digitalExchangeRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
