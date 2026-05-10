const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');
const pdfService = require('../../services/pdf.service');

async function donationsReport(query) {
  const { from, to, bloodGroup, bloodBankId, format = 'json' } = query;
  const where = {};
  if (from) where.donationDate = { gte: new Date(from) };
  if (to) where.donationDate = { ...where.donationDate, lte: new Date(to) };
  if (bloodBankId) where.bloodBankId = bloodBankId;

  const donations = await prisma.donationEvent.findMany({
    where,
    include: {
      donor: { select: { name: true, bloodGroup: true } },
      patient: { select: { name: true, patientDisplayId: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true } },
      bloodBank: { select: { name: true } },
    },
    orderBy: { donationDate: 'desc' },
  });

  if (format === 'pdf') {
    return pdfService.generateDonationsReport(donations, { from, to, bloodBankId });
  }

  return donations;
}

async function receivablesReport(query) {
  const { bloodBankId, date, format = 'json' } = query;
  const where = { creditorBankId: bloodBankId, entryType: 'RECEIVABLE', status: 'ACTIVE' };

  const entries = await prisma.balanceSheetEntry.findMany({
    where,
    include: {
      debtorBank: { select: { name: true, city: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'pdf') {
    return pdfService.generateBalanceSheetReport(entries, 'receivables', { bloodBankId, date });
  }

  return entries;
}

async function deliverablesReport(query) {
  const { bloodBankId, date, format = 'json' } = query;
  const where = { debtorBankId: bloodBankId, entryType: 'DELIVERABLE', status: 'ACTIVE' };

  const entries = await prisma.balanceSheetEntry.findMany({
    where,
    include: {
      creditorBank: { select: { name: true, city: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'pdf') {
    return pdfService.generateBalanceSheetReport(entries, 'deliverables', { bloodBankId, date });
  }

  return entries;
}

async function physicalTransferReport(bankId, query) {
  const { type = 'sent', from, to } = query;
  const where = type === 'sent'
    ? { supplierBankId: bankId }
    : { recipientBankId: bankId };

  if (from) where.createdAt = { gte: new Date(from) };
  if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

  return prisma.transferFormB.findMany({
    where,
    include: {
      supplierBank: { select: { name: true } },
      recipientBank: { select: { name: true } },
      units: { include: { prbcUnit: { select: { bloodUnitNo: true, bloodGroup: true } } } },
      response: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function digitalTransferReport(bankId, query) {
  const { from, to } = query;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  return prisma.$queryRaw`
    SELECT * FROM digital_exchange_events
    WHERE (initiatedByBankId = ${bankId}
       OR JSON_CONTAINS(participantBanks, ${JSON.stringify(bankId)}, '$'))
      AND status = 'EXECUTED'
      ${fromDate ? Prisma.sql`AND createdAt >= ${fromDate}` : Prisma.empty}
      ${toDate ? Prisma.sql`AND createdAt <= ${toDate}` : Prisma.empty}
    ORDER BY createdAt DESC
  `;
}

module.exports = { donationsReport, receivablesReport, deliverablesReport, physicalTransferReport, digitalTransferReport };
