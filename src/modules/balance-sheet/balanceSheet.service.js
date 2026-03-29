const prisma = require('../../config/database');

async function getReceivables(bankId, query) {
  const where = { creditorBankId: bankId, entryType: 'RECEIVABLE', status: 'ACTIVE' };
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;

  return prisma.balanceSheetEntry.findMany({
    where,
    include: {
      debtorBank: { select: { id: true, name: true, city: true, state: true, contactMobile: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true, dateOfCollection: true } },
      patient: { select: { name: true, patientDisplayId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getDeliverables(bankId, query) {
  const where = { debtorBankId: bankId, entryType: 'DELIVERABLE', status: 'ACTIVE' };
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;

  return prisma.balanceSheetEntry.findMany({
    where,
    include: {
      creditorBank: { select: { id: true, name: true, city: true, state: true, contactMobile: true } },
      donorCard: { select: { donorCardDisplayId: true, bloodGroup: true, dateOfCollection: true } },
      patient: { select: { name: true, patientDisplayId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getSummary(bankId) {
  const [receivablesByGroup, deliverablesByGroup] = await Promise.all([
    prisma.balanceSheetEntry.groupBy({
      by: ['bloodGroup'],
      where: { creditorBankId: bankId, entryType: 'RECEIVABLE', status: 'ACTIVE' },
      _sum: { units: true },
    }),
    prisma.balanceSheetEntry.groupBy({
      by: ['bloodGroup'],
      where: { debtorBankId: bankId, entryType: 'DELIVERABLE', status: 'ACTIVE' },
      _sum: { units: true },
    }),
  ]);

  const receivablesMap = {};
  for (const r of receivablesByGroup) receivablesMap[r.bloodGroup] = r._sum.units || 0;

  const deliverablesMap = {};
  for (const d of deliverablesByGroup) deliverablesMap[d.bloodGroup] = d._sum.units || 0;

  // Net = receivables - deliverables per blood group
  const allGroups = new Set([...Object.keys(receivablesMap), ...Object.keys(deliverablesMap)]);
  const netPosition = {};
  for (const group of allGroups) {
    netPosition[group] = {
      receivable: receivablesMap[group] || 0,
      deliverable: deliverablesMap[group] || 0,
      net: (receivablesMap[group] || 0) - (deliverablesMap[group] || 0),
    };
  }

  return { netPosition };
}

async function getNeighbours(bankId) {
  // Direct relationships (1-hop)
  const directReceivables = await prisma.balanceSheetEntry.findMany({
    where: { creditorBankId: bankId, status: 'ACTIVE' },
    select: { debtorBankId: true, bloodGroup: true, units: true },
  });

  const directBankIds = [...new Set(directReceivables.map(r => r.debtorBankId))];

  // 2-hop: banks that owe to our direct neighbors
  const hop2 = directBankIds.length > 0 ? await prisma.balanceSheetEntry.findMany({
    where: {
      creditorBankId: { in: directBankIds },
      status: 'ACTIVE',
      debtorBankId: { not: bankId }, // exclude self
    },
    include: {
      debtorBank: { select: { id: true, name: true, city: true } },
      creditorBank: { select: { id: true, name: true } },
    },
  }) : [];

  return { directBankIds, hop2Entries: hop2 };
}

module.exports = { getReceivables, getDeliverables, getSummary, getNeighbours };
