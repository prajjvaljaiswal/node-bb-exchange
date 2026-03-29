const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

async function listBanks(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { registrationNo: { contains: query.search, mode: 'insensitive' } },
      { city: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.state) where.state = query.state;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [total, items] = await Promise.all([
    prisma.bloodBank.count({ where }),
    prisma.bloodBank.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, registrationNo: true, city: true,
        state: true, contactMobile: true, email: true, isActive: true,
        approvedAt: true, createdAt: true,
        _count: { select: { admins: true, donorCards: true } },
      },
    }),
  ]);

  return paginatedResponse(items, total, page, limit);
}

async function getBank(id, requestingUser) {
  const bank = await prisma.bloodBank.findUnique({
    where: { id },
    include: {
      admins: {
        include: { user: { select: { email: true, isEmailVerified: true } } },
      },
      _count: {
        select: {
          donorCards: true,
          wholeBloodInventory: true,
          prbcInventory: true,
        },
      },
    },
  });

  if (!bank) throw Object.assign(new Error('Blood bank not found'), { status: 404, code: 'NOT_FOUND' });

  // Blood bank admins can only see their own bank
  if (requestingUser.role === 'BLOOD_BANK_ADMIN' && requestingUser.bloodBankId !== id) {
    throw Object.assign(new Error('Access denied'), { status: 403, code: 'FORBIDDEN' });
  }

  return bank;
}

async function approveBank(id, adminUserId) {
  const bank = await prisma.bloodBank.findUnique({ where: { id } });
  if (!bank) throw Object.assign(new Error('Blood bank not found'), { status: 404, code: 'NOT_FOUND' });

  const updated = await prisma.$transaction(async (tx) => {
    const b = await tx.bloodBank.update({
      where: { id },
      data: { isActive: true, approvedBy: adminUserId, approvedAt: new Date() },
    });
    // Activate primary admin
    await tx.bloodBankAdmin.updateMany({
      where: { bloodBankId: id, isPrimary: true },
      data: { authStatus: 'ACTIVE' },
    });
    return b;
  });

  return updated;
}

async function suspendBank(id) {
  return prisma.bloodBank.update({
    where: { id },
    data: { isActive: false },
  });
}

async function updateBank(id, data) {
  return prisma.bloodBank.update({
    where: { id },
    data,
  });
}

async function listAdmins(bankId) {
  return prisma.bloodBankAdmin.findMany({
    where: { bloodBankId: bankId },
    include: { user: { select: { email: true, isEmailVerified: true, isActive: true } } },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

async function createAdmin(bankId, data) {
  const { name, designation, mobile, email, password, isPrimary } = data;

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { v4: uuidv4 } = require('uuid');
  const emailVerifyToken = uuidv4();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, role: 'BLOOD_BANK_ADMIN', emailVerifyToken },
    });

    const admin = await tx.bloodBankAdmin.create({
      data: {
        userId: user.id,
        bloodBankId: bankId,
        name,
        designation,
        mobile,
        authStatus: 'PENDING',
        isPrimary: isPrimary || false,
      },
    });

    return { admin, message: 'Admin created. Verification email sent.' };
  });
}

async function updateAdminStatus(bankId, adminId, authStatus) {
  const admin = await prisma.bloodBankAdmin.findFirst({
    where: { id: adminId, bloodBankId: bankId },
  });
  if (!admin) throw Object.assign(new Error('Admin not found'), { status: 404, code: 'NOT_FOUND' });

  return prisma.bloodBankAdmin.update({
    where: { id: adminId },
    data: { authStatus },
  });
}

async function deleteAdmin(bankId, adminId, requestingUserId) {
  const admin = await prisma.bloodBankAdmin.findFirst({
    where: { id: adminId, bloodBankId: bankId },
  });
  if (!admin) throw Object.assign(new Error('Admin not found'), { status: 404, code: 'NOT_FOUND' });
  if (admin.isPrimary) throw Object.assign(new Error('Cannot delete primary admin'), { status: 400, code: 'CANNOT_DELETE_PRIMARY' });

  await prisma.bloodBankAdmin.delete({ where: { id: adminId } });
  return { message: 'Admin removed' };
}

module.exports = { listBanks, getBank, approveBank, suspendBank, updateBank, listAdmins, createAdmin, updateAdminStatus, deleteAdmin };
