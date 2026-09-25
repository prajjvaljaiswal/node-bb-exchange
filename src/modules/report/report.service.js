const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');
const pdfService = require('../../services/pdf.service');
const emailService = require('../../services/email.service');

async function donationsReport(query, adminUser = null, customEmailTo = null) {
  const { date, from, to, bloodBankId, format = 'json' } = query;
  const where = {};

  // Single-date filter (Module 4) takes precedence over from/to range
  if (date) {
    const d = new Date(date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    where.donationDate = { gte: start, lte: end };
  } else {
    if (from) where.donationDate = { gte: new Date(from) };
    if (to) where.donationDate = { ...where.donationDate, lte: new Date(to) };
  }

  if (bloodBankId) where.bloodBankId = bloodBankId;

  const donations = await prisma.donationEvent.findMany({
    where,
    include: {
      donor: { select: { id: true, name: true, bloodGroup: true, mobile: true } },
      patient: { select: { name: true, patientDisplayId: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true } },
      bloodBank: { select: { name: true, email: true } },
    },
    orderBy: { donationDate: 'asc' },
  });

  // Email mode: to logged-in admin or to any custom email address (Module 7: "send to self or to anyone")
  if (adminUser || customEmailTo) {
    const bank = bloodBankId
      ? await prisma.bloodBank.findUnique({ where: { id: bloodBankId }, select: { name: true } })
      : null;
    const bankName = bank?.name || 'All Banks';
    const dateLabel = date
      ? new Date(date).toLocaleDateString('en-IN')
      : (from ? new Date(from).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'));

    const pdfBuffer = await pdfService.generateDateWiseDonationsReport(donations, { bankName, date });
    const targetEmail = customEmailTo || adminUser.email;
    await emailService.sendDonationReportEmail(targetEmail, bankName, dateLabel, pdfBuffer);
    return { message: `Report emailed to ${targetEmail}`, totalDonations: donations.length };
  }

  if (format === 'pdf') {
    const bank = bloodBankId
      ? await prisma.bloodBank.findUnique({ where: { id: bloodBankId }, select: { name: true } })
      : null;
    return pdfService.generateDateWiseDonationsReport(donations, {
      bankName: bank?.name || 'All Banks',
      date: date || from,
    });
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
