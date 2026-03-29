const prisma = require('../../config/database');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');

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
        unitsRequired: true, status: true, hospitalName: true,
        registeredBloodBank: { select: { id: true, name: true } },
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

module.exports = { listPatients, getPatient, confirmRegistration, getRecommendation, fulfilPatient };
