const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');
const emailService = require('../../services/email.service');

const BCRYPT_ROUNDS = process.env.DEV_MODE === 'true' ? 4 : (parseInt(process.env.BCRYPT_ROUNDS) || 12);

async function createPatient(data, adminBloodBankId) {
  const { name, age, sex, bloodGroup, unitsRequired,
    address, district, state, nationality,
    hospitalName, hospitalType, doctorName,
    disease, contactPerson1, contactPerson2, contactPerson3,
    mobile, email, modeOfPayment,
    bankAccountName, bankAccountNo, bankAccountIFSC, bankAccountUPI,
    registeredBloodBankId } = data;

  const patientDisplayId = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const tempPassword = Math.random().toString(36).substr(2, 10);
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
  const patientEmail = email || `${patientDisplayId.toLowerCase()}@bloodexchange.in`;
  const emailVerifyToken = uuidv4();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: patientEmail,
        passwordHash,
        role: 'PATIENT',
        isEmailVerified: !!email,
        emailVerifyToken: email ? emailVerifyToken : null,
      },
    });

    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        patientDisplayId,
        name,
        age,
        sex,
        bloodGroup,
        unitsRequired,
        address: address || null,
        district: district || null,
        state: state || null,
        nationality: nationality || 'Indian',
        hospitalName,
        hospitalType: hospitalType || null,
        doctorName: doctorName || null,
        disease: disease || null,
        contactPerson1: contactPerson1 || null,
        contactPerson2: contactPerson2 || null,
        contactPerson3: contactPerson3 || null,
        mobile,
        email: email || null,
        modeOfPayment: modeOfPayment || 'ONLINE',
        bankAccountName: bankAccountName || null,
        bankAccountNo: bankAccountNo || null,
        bankAccountIFSC: bankAccountIFSC || null,
        bankAccountUPI: bankAccountUPI || null,
        registeredBloodBankId: registeredBloodBankId || adminBloodBankId || null,
        status: 'PENDING_PAYMENT',
      },
    });

    return { patient, patientEmail, tempPassword };
  });

  if (email) {
    await emailService.sendPatientRegistration(email, name, patientDisplayId, tempPassword);
  }

  return { patient: result.patient, message: 'Patient registered. Login credentials sent to patient.' };
}

async function listPatients(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.status) where.status = query.status;
  if (query.bloodBankId) where.registeredBloodBankId = query.bloodBankId;

  const [total, items] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, patientDisplayId: true, name: true, bloodGroup: true,
        unitsRequired: true, status: true, hospitalName: true, hospitalType: true,
        address: true, district: true, state: true, mobile: true,
        registeredBloodBank: { select: { id: true, name: true, city: true } },
        createdAt: true,
      },
    }),
  ]);

  return paginatedResponse(items, total, page, limit);
}

async function getPatient(id) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      registeredBloodBank: { select: { id: true, name: true, city: true } },
    },
  });
  if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404, code: 'NOT_FOUND' });
  return patient;
}

async function confirmRegistration(patientId, paymentData) {
  const crypto = require('crypto');
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSig !== razorpaySignature) {
    throw Object.assign(new Error('Invalid payment signature'), { status: 400, code: 'INVALID_SIGNATURE' });
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { razorpayOrderId, patientId },
      data: { status: 'CAPTURED', razorpayPaymentId },
    });

    return tx.patient.update({
      where: { id: patientId },
      data: { status: 'ACTIVE', registrationFeePaid: true },
    });
  });
}

async function getRecommendation(patientId) {
  return prisma.recommendationNode.findMany({
    where: { forPatientId: patientId },
    orderBy: { displayOrder: 'asc' },
    include: {
      bloodBank: { select: { id: true, name: true, city: true, state: true, contactMobile: true } },
      donorCard: { select: { id: true, donorCardDisplayId: true, bloodGroup: true, dateOfCollection: true } },
    },
  });
}

async function fulfilPatient(patientId, adminId) {
  return prisma.patient.update({
    where: { id: patientId },
    data: { status: 'FULFILLED' },
  });
}

// Module 2 plan: "Edit/update Requirement: change blood-bank-id-2 and no. of units required"
async function updatePatient(patientId, data) {
  const { bloodGroup, unitsRequired, registeredBloodBankId, doctorName, disease, hospitalName } = data;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404, code: 'NOT_FOUND' });

  return prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(bloodGroup !== undefined && { bloodGroup }),
      ...(unitsRequired !== undefined && { unitsRequired: parseInt(unitsRequired) }),
      ...(registeredBloodBankId !== undefined && { registeredBloodBankId }),
      ...(doctorName !== undefined && { doctorName }),
      ...(disease !== undefined && { disease }),
      ...(hospitalName !== undefined && { hospitalName }),
    },
  });
}

module.exports = { createPatient, listPatients, getPatient, confirmRegistration, getRecommendation, fulfilPatient, updatePatient };
