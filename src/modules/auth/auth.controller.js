const authService = require('./auth.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');
const prisma = require('../../config/database');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

async function registerBloodBank(req, res, next) {
  try {
    const result = await authService.registerBloodBank(req.body);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function registerDonor(req, res, next) {
  try {
    const result = await authService.registerDonor(req.body);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function registerPatient(req, res, next) {
  try {
    const result = await authService.registerPatient(req.body);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, role } = await authService.login(email, password);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { accessToken, role });
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'No refresh token' } });
    const { accessToken, refreshToken } = await authService.refresh(token);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { accessToken });
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await authService.logout(req.user.id, token);
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmail(req.body.token);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.email);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const { id, email, role, isEmailVerified, bloodBankId } = req.user;
    let donorId = null;
    let patientId = null;
    if (role === 'DONOR') {
      const donor = await prisma.donor.findUnique({ where: { userId: id }, select: { id: true } });
      donorId = donor?.id || null;
    } else if (role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: id }, select: { id: true } });
      patientId = patient?.id || null;
    }
    sendSuccess(res, { id, email, role, isEmailVerified, bloodBankId, donorId, patientId });
  } catch (err) { next(err); }
}

module.exports = { registerBloodBank, registerDonor, registerPatient, login, refresh, logout, verifyEmail, forgotPassword, resetPassword, me };
