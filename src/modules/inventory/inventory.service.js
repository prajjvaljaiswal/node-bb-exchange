const prisma = require('../../config/database');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');

async function listWholeBlood(bankId, query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { bloodBankId: bankId };
  if (query.status) where.status = query.status;
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;

  const [total, items] = await Promise.all([
    prisma.wholeBloodInventory.count({ where }),
    prisma.wholeBloodInventory.findMany({
      where, skip, take: limit,
      orderBy: { dateOfCollection: 'desc' },
      include: { donorCard: { select: { donorCardDisplayId: true } } },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function recordTTI(bankId, unitId, ttiData) {
  const unit = await prisma.wholeBloodInventory.findFirst({ where: { id: unitId, bloodBankId: bankId } });
  if (!unit) throw Object.assign(new Error('Unit not found'), { status: 404, code: 'NOT_FOUND' });

  const allPassed = Object.values(ttiData).every(v => v === 'PASSED');
  const anyFailed = Object.values(ttiData).some(v => v === 'FAILED');

  let status = unit.status;
  if (allPassed) status = 'READY_FOR_SEPARATION';
  if (anyFailed) status = 'FAILED_TTI';

  return prisma.wholeBloodInventory.update({
    where: { id: unitId },
    data: { ...ttiData, dateOfTesting: new Date(), status },
  });
}

async function separateBlood(bankId, unitId) {
  const unit = await prisma.wholeBloodInventory.findFirst({
    where: { id: unitId, bloodBankId: bankId, status: 'READY_FOR_SEPARATION' },
  });
  if (!unit) throw Object.assign(new Error('Unit not ready for separation'), { status: 400, code: 'NOT_READY' });

  const BLOOD_EXPIRY_DAYS = 35;
  const expiry = new Date(unit.dateOfCollection);
  expiry.setDate(expiry.getDate() + BLOOD_EXPIRY_DAYS);

  return prisma.$transaction(async (tx) => {
    await tx.wholeBloodInventory.update({
      where: { id: unitId },
      data: { status: 'SEPARATED' },
    });

    const prbc = await tx.pRBCInventory.create({
      data: {
        donorCardId: unit.donorCardId,
        bloodUnitNo: unit.bloodUnitNo,
        bloodGroup: unit.bloodGroup,
        dateOfDonation: unit.dateOfCollection,
        dateOfExpiration: expiry,
        bloodBankId: bankId,
        bloodTestPassed: true,
        transferType: 'INTERNAL',
        status: 'AVAILABLE',
      },
    });

    await tx.donorCard.update({
      where: { id: unit.donorCardId },
      data: { status: 'IN_PRBC' },
    });

    return prbc;
  });
}

async function listPRBC(bankId, query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = { bloodBankId: bankId };
  if (query.status) where.status = query.status;
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;

  const [total, items] = await Promise.all([
    prisma.pRBCInventory.count({ where }),
    prisma.pRBCInventory.findMany({
      where, skip, take: limit,
      orderBy: { dateOfExpiration: 'asc' },
      include: {
        donorCard: { select: { donorCardDisplayId: true } },
        reservedForPatient: { select: { name: true, patientDisplayId: true } },
      },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function prbcSummary(bankId) {
  const groups = await prisma.pRBCInventory.groupBy({
    by: ['bloodGroup', 'status'],
    where: { bloodBankId: bankId },
    _count: { id: true },
  });

  // Restructure into { [bloodGroup]: { AVAILABLE: n, RESERVED: n, ... } }
  const summary = {};
  for (const g of groups) {
    if (!summary[g.bloodGroup]) summary[g.bloodGroup] = {};
    summary[g.bloodGroup][g.status] = g._count.id;
  }

  const expiryWarning = await prisma.pRBCInventory.count({
    where: {
      bloodBankId: bankId,
      status: 'AVAILABLE',
      dateOfExpiration: {
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // within 7 days
      },
    },
  });

  return { summary, expiryWarning };
}

module.exports = { listWholeBlood, recordTTI, separateBlood, listPRBC, prbcSummary };
