const prisma = require('../../config/database');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');

async function createGroup(data, createdBy) {
  return prisma.bloodBankGroup.create({
    data: { ...data, createdBy },
  });
}

async function listGroups(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.state) where.state = query.state;

  const [total, items] = await Promise.all([
    prisma.bloodBankGroup.count({ where }),
    prisma.bloodBankGroup.findMany({
      where, skip, take: limit,
      include: {
        _count: { select: { members: true } },
        members: { where: { status: 'ACTIVE' }, take: 5, include: { bloodBank: { select: { id: true, name: true, city: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return paginatedResponse(items, total, page, limit);
}

async function getGroup(id) {
  const group = await prisma.bloodBankGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { bloodBank: { select: { id: true, name: true, city: true, state: true, isActive: true } } },
      },
    },
  });
  if (!group) throw Object.assign(new Error('Group not found'), { status: 404, code: 'NOT_FOUND' });
  return group;
}

async function addMember(groupId, bloodBankId) {
  return prisma.bloodBankGroupMember.create({
    data: { groupId, bloodBankId, status: 'PENDING' },
  });
}

async function approveMember(groupId, memberId) {
  return prisma.bloodBankGroupMember.update({
    where: { id: memberId },
    data: { status: 'ACTIVE' },
  });
}

async function removeMember(groupId, memberId) {
  await prisma.bloodBankGroupMember.delete({ where: { id: memberId } });
  return { message: 'Member removed' };
}

async function getGroupBalanceSheets(groupId, requestingBankId) {
  // Verify requesting bank is an active member
  const membership = await prisma.bloodBankGroupMember.findFirst({
    where: { groupId, bloodBankId: requestingBankId, status: 'ACTIVE' },
  });
  if (!membership) throw Object.assign(new Error('Not a group member'), { status: 403, code: 'FORBIDDEN' });

  const members = await prisma.bloodBankGroupMember.findMany({
    where: { groupId, status: 'ACTIVE' },
    include: { bloodBank: { select: { id: true, name: true } } },
  });

  const bankIds = members.map(m => m.bloodBankId);

  const balanceData = await Promise.all(
    bankIds.map(async (bankId) => {
      const [receivables, deliverables] = await Promise.all([
        prisma.balanceSheetEntry.groupBy({
          by: ['bloodGroup'],
          where: { creditorBankId: bankId, status: 'ACTIVE' },
          _sum: { units: true },
        }),
        prisma.balanceSheetEntry.groupBy({
          by: ['bloodGroup'],
          where: { debtorBankId: bankId, status: 'ACTIVE' },
          _sum: { units: true },
        }),
      ]);
      return {
        bankId,
        bankName: members.find(m => m.bloodBankId === bankId)?.bloodBank.name,
        receivables,
        deliverables,
      };
    })
  );

  return balanceData;
}

async function citySearch(groupId, bloodGroup, state) {
  const members = await prisma.bloodBankGroupMember.findMany({
    where: { groupId, status: 'ACTIVE' },
    include: { bloodBank: true },
  });

  if (members.length < 20) {
    throw Object.assign(new Error('City blood search requires at least 20 active group members'), { status: 400, code: 'INSUFFICIENT_MEMBERS' });
  }

  const bankIds = members.map(m => m.bloodBankId);
  const available = await prisma.pRBCInventory.findMany({
    where: {
      bloodBankId: { in: bankIds },
      bloodGroup,
      status: 'AVAILABLE',
    },
    include: {
      bloodBank: { select: { id: true, name: true, city: true, state: true, contactMobile: true } },
    },
    orderBy: { dateOfExpiration: 'asc' },
  });

  return { bloodGroup, count: available.length, units: available };
}

module.exports = { createGroup, listGroups, getGroup, addMember, approveMember, removeMember, getGroupBalanceSheets, citySearch };
