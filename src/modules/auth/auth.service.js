const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const redis = require('../../config/redis');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/tokenUtils');
const emailService = require('../../services/email.service');

const BCRYPT_ROUNDS = process.env.DEV_MODE === 'true' ? 4 : (parseInt(process.env.BCRYPT_ROUNDS) || 12);

async function registerBloodBank(data) {
  const { email, password, bankName, registrationNo, registrationValidUpto, gstNo,
    address, city, district, state, pincode, contactMobile, bankEmail,
    adminName, adminDesignation, adminMobile } = data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const emailVerifyToken = uuidv4();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: 'BLOOD_BANK_ADMIN',
        emailVerifyToken,
      },
    });

    const bank = await tx.bloodBank.create({
      data: {
        name: bankName,
        registrationNo,
        registrationValidUpto: new Date(registrationValidUpto),
        gstNo,
        address,
        city,
        district,
        state,
        pincode,
        contactMobile,
        email: bankEmail,
      },
    });

    await tx.bloodBankAdmin.create({
      data: {
        userId: user.id,
        bloodBankId: bank.id,
        name: adminName,
        designation: adminDesignation,
        mobile: adminMobile,
        isPrimary: true,
        authStatus: 'PENDING',
      },
    });

    return { user, bank };
  });

  await emailService.sendEmailVerification(email, adminName, emailVerifyToken);
  return { message: 'Registration submitted. Awaiting platform admin approval and email verification.' };
}

async function registerDonor(data) {
  const { email, password, name, age, sex, mobile, weight, bloodGroup, address, state, pincode,
    bankAccountName, bankAccountIFSC, bankAccountUPI } = data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const emailVerifyToken = uuidv4();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: 'DONOR', emailVerifyToken },
    });

    await tx.donor.create({
      data: { userId: user.id, name, age, sex, mobile, email, weight, bloodGroup, address, state, pincode,
        bankAccountName, bankAccountIFSC, bankAccountUPI },
    });

    return user;
  });

  await emailService.sendEmailVerification(email, name, emailVerifyToken);
  return { message: 'Registration successful. Please verify your email.' };
}

async function registerPatient(data) {
  const { email, password, name, age, sex, bloodGroup, unitsRequired, hospitalName, doctorName,
    disease, contactPerson1, contactPerson2, contactPerson3, mobile, modeOfPayment,
    bankAccountName, bankAccountIFSC, bankAccountUPI, registeredBloodBankId } = data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const emailVerifyToken = uuidv4();
  const patientDisplayId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: 'PATIENT', emailVerifyToken },
    });

    await tx.patient.create({
      data: {
        userId: user.id,
        patientDisplayId,
        name,
        age,
        sex,
        bloodGroup,
        unitsRequired,
        hospitalName,
        doctorName,
        disease,
        contactPerson1,
        contactPerson2,
        contactPerson3,
        mobile,
        email,
        modeOfPayment: modeOfPayment || 'ONLINE',
        bankAccountName,
        bankAccountIFSC,
        bankAccountUPI,
        registeredBloodBankId,
        status: 'PENDING_PAYMENT',
      },
    });

    return user;
  });

  await emailService.sendEmailVerification(email, name, emailVerifyToken);
  return { message: 'Registration successful. Please verify your email and complete registration fee payment.' };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { bloodBankAdmin: true },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401, code: 'INVALID_CREDENTIALS' });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken, role: user.role };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });
  }

  const stored = await prisma.refreshToken.findFirst({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { bloodBankAdmin: true },
  });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('User not found'), { status: 401, code: 'INVALID_REFRESH_TOKEN' });
  }

  // Rotate refresh token
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  const newRefreshToken = generateRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = generateAccessToken(user);
  return { accessToken, refreshToken: newRefreshToken };
}

async function logout(userId, accessToken) {
  // Blacklist access token
  await redis.setex(`blacklist:token:${accessToken}`, 15 * 60, '1');
  // Delete all refresh tokens for user
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

async function verifyEmail(token) {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) throw Object.assign(new Error('Invalid token'), { status: 400, code: 'INVALID_TOKEN' });

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });

  return { message: 'Email verified successfully' };
}

async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = uuidv4();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await emailService.sendPasswordReset(email, token);
  }
  return { message: 'If that email exists, a reset link has been sent.' };
}

async function resetPassword(token, newPassword) {
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } },
  });
  if (!user) throw Object.assign(new Error('Invalid or expired token'), { status: 400, code: 'INVALID_TOKEN' });

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });

  return { message: 'Password reset successful' };
}

module.exports = { registerBloodBank, registerDonor, registerPatient, login, refresh, logout, verifyEmail, forgotPassword, resetPassword };
