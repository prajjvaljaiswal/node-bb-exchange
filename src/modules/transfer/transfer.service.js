const prisma = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');
const emailService = require('../../services/email.service');
const { getIO } = require('../../config/socket');

async function createFormA(data, requestedByAdminId, recipientBankId) {
  const { supplierBankId, patientId, bloodGroup, unitsRequested, urgencyLevel } = data;

  const formDisplayId = `FA-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const formA = await prisma.transferFormA.create({
    data: {
      formDisplayId,
      recipientBankId,
      supplierBankId,
      patientId,
      bloodGroup,
      unitsRequested,
      urgencyLevel,
      requestedByAdminId,
      status: 'SENT',
    },
    include: {
      supplierBank: { select: { email: true, name: true } },
    },
  });

  // Notify supplier bank
  try {
    await emailService.sendTransferFormANotification(
      formA.supplierBank.email,
      formA.supplierBank.name,
      formDisplayId,
      bloodGroup,
      unitsRequested
    );
    const io = getIO();
    io.to(`bank:${supplierBankId}`).emit('transfer.requested', { formDisplayId, bloodGroup, unitsRequested });
  } catch {}

  return formA;
}

async function listFormA(query, user) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (user.role === 'BLOOD_BANK_ADMIN') {
    where.OR = [
      { recipientBankId: user.bloodBankId },
      { supplierBankId: user.bloodBankId },
    ];
  }
  if (query.status) where.status = query.status;

  const [total, items] = await Promise.all([
    prisma.transferFormA.count({ where }),
    prisma.transferFormA.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        recipientBank: { select: { id: true, name: true, city: true } },
        supplierBank: { select: { id: true, name: true, city: true } },
        patient: { select: { name: true, patientDisplayId: true } },
        response: true,
      },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function getFormA(id) {
  return prisma.transferFormA.findUnique({
    where: { id },
    include: {
      recipientBank: true, supplierBank: true, patient: true,
      requestedByAdmin: true, response: true, formB: true,
    },
  });
}

async function respondFormA(formAId, data, respondingAdminId) {
  const { status, unitsCommitted, rejectionReason } = data;

  return prisma.$transaction(async (tx) => {
    await tx.transferFormAResponse.create({
      data: { formAId, respondedByAdminId: respondingAdminId, status, unitsCommitted, rejectionReason },
    });
    return tx.transferFormA.update({
      where: { id: formAId },
      data: { status },
    });
  });
}

async function createFormB(data, issuedByAdminId) {
  const { formAId, prbcUnitIds, transportDetails, dispatchDate, expectedArrivalDate } = data;

  const formA = await prisma.transferFormA.findUnique({ where: { id: formAId } });
  if (!formA || formA.status !== 'ACCEPTED') {
    throw Object.assign(new Error('Form A not accepted'), { status: 400, code: 'FORM_A_NOT_ACCEPTED' });
  }

  // Check for receivable (zero fee condition)
  const receivable = await prisma.balanceSheetEntry.findFirst({
    where: {
      creditorBankId: formA.recipientBankId,
      debtorBankId: formA.supplierBankId,
      bloodGroup: formA.bloodGroup,
      status: 'ACTIVE',
    },
  });

  const formDisplayId = `FB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

  const formB = await prisma.$transaction(async (tx) => {
    const fb = await tx.transferFormB.create({
      data: {
        formDisplayId,
        formAId,
        supplierBankId: formA.supplierBankId,
        recipientBankId: formA.recipientBankId,
        issuedByAdminId,
        transportDetails,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
        expectedArrivalDate: expectedArrivalDate ? new Date(expectedArrivalDate) : null,
        status: 'ISSUED',
        units: {
          create: prbcUnitIds.map(id => ({ prbcUnitId: id })),
        },
      },
    });

    // Update Form A status
    await tx.transferFormA.update({ where: { id: formAId }, data: { status: 'FULFILLED' } });

    // Reserve PRBC units
    await tx.pRBCInventory.updateMany({
      where: { id: { in: prbcUnitIds } },
      data: { status: 'RESERVED' },
    });

    // Settle receivable if exists
    if (receivable) {
      await tx.balanceSheetEntry.update({
        where: { id: receivable.id },
        data: { status: 'SETTLED' },
      });
    }

    return fb;
  });

  // Notify recipient
  try {
    const recipientBank = await prisma.bloodBank.findUnique({ where: { id: formA.recipientBankId }, select: { email: true, name: true } });
    await emailService.sendFormBDispatchNotification(
      recipientBank.email, recipientBank.name, formDisplayId,
      dispatchDate ? new Date(dispatchDate).toLocaleDateString('en-IN') : 'Today'
    );
    const io = getIO();
    io.to(`bank:${formA.recipientBankId}`).emit('form.received', { type: 'FORM_B', formDisplayId });
  } catch {}

  return { formB, feeWaived: !!receivable };
}

async function listFormB(query, user) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (user.role === 'BLOOD_BANK_ADMIN') {
    where.OR = [
      { recipientBankId: user.bloodBankId },
      { supplierBankId: user.bloodBankId },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.transferFormB.count({ where }),
    prisma.transferFormB.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplierBank: { select: { id: true, name: true } },
        recipientBank: { select: { id: true, name: true } },
        units: { include: { prbcUnit: { select: { bloodUnitNo: true, bloodGroup: true } } } },
        response: true,
      },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function getFormB(id) {
  return prisma.transferFormB.findUnique({
    where: { id },
    include: {
      formA: true, supplierBank: true, recipientBank: true, issuedByAdmin: true,
      units: { include: { prbcUnit: true } }, response: true,
    },
  });
}

async function receiveFormB(formBId, data, receivedByAdminId) {
  const { unitsReceived, discrepancyNotes } = data;
  const hasDiscrepancy = !!discrepancyNotes;

  return prisma.$transaction(async (tx) => {
    await tx.transferFormBResponse.create({
      data: { formBId, receivedByAdminId, unitsReceived, discrepancyNotes },
    });

    return tx.transferFormB.update({
      where: { id: formBId },
      data: { status: hasDiscrepancy ? 'DISCREPANCY' : 'DELIVERED' },
    });
  });
}

async function reportDiscrepancy(formBId, notes) {
  return prisma.transferFormB.update({
    where: { id: formBId },
    data: { status: 'DISCREPANCY' },
  });
}

module.exports = { createFormA, listFormA, getFormA, respondFormA, createFormB, listFormB, getFormB, receiveFormB, reportDiscrepancy };
