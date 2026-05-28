const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const emailService = require('../../services/email.service');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');
const { getCompatibleDonorGroups } = require('../../utils/bloodGroup');

const BCRYPT_ROUNDS = process.env.DEV_MODE === 'true' ? 4 : (parseInt(process.env.BCRYPT_ROUNDS) || 12);

async function listDonors(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.state) where.state = query.state;
  if (query.bankId) where.registeredBloodBankId = query.bankId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { mobile: { contains: query.search } },
      { email: { contains: query.search } },
      { donorDisplayId: { contains: query.search } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.donor.count({ where }),
    prisma.donor.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { isActive: true, isEmailVerified: true } } },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function getDonor(id) {
  const donor = await prisma.donor.findUnique({
    where: { id },
    include: {
      user: { select: { isActive: true, isEmailVerified: true, email: true } },
      _count: { select: { donorCards: true, donations: true } },
    },
  });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });
  return donor;
}

async function getDonorCards(donorId) {
  return prisma.donorCard.findMany({
    where: { donorLink: { donorId } },
    include: {
      bloodBank: { select: { id: true, name: true, city: true, registrationNo: true } },
      donorLink: { include: { donor: { select: { id: true, donorDisplayId: true } } } },
    },
    orderBy: { dateOfCollection: 'desc' },
  });
}

async function getEligiblePatients(donorId) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });

  const compatibleGroups = getCompatibleDonorGroups(donor.bloodGroup);

  return prisma.patient.findMany({
    where: {
      bloodGroup: { in: compatibleGroups },
      status: 'ACTIVE',
    },
    select: {
      id: true, patientDisplayId: true, name: true, bloodGroup: true,
      unitsRequired: true, hospitalName: true, hospitalType: true,
      disease: true, district: true, state: true, mobile: true,
      registeredBloodBank: { select: { id: true, name: true, city: true, state: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
}

async function selectPatient(donorId, patientId) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.status !== 'ACTIVE') {
    throw Object.assign(new Error('Patient not available'), { status: 400, code: 'PATIENT_UNAVAILABLE' });
  }
  return { message: 'Patient selected. Please visit the blood bank to donate.', patient };
}

// BBA creates a donor registration (Module 6)
async function createDonor(data, registeredBloodBankId) {
  const { name, age, sex, nationality, mobile, email, weight, bloodGroup,
    address, state, pincode, bankAccountName, bankAccountNo, bankAccountIFSC, bankAccountUPI } = data;

  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
  const donorDisplayId = `DON-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const placeholderEmail = email || `donor.${donorDisplayId.toLowerCase()}@bloodexchange.in`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: placeholderEmail,
        passwordHash,
        role: 'DONOR',
        isEmailVerified: true,
        isActive: false, // BBA must authenticate before donor can log in
      },
    });

    const donor = await tx.donor.create({
      data: {
        userId: user.id,
        donorDisplayId,
        name,
        age: parseInt(age),
        sex,
        nationality: nationality || 'Indian',
        mobile,
        email: placeholderEmail,
        weight: parseFloat(weight),
        bloodGroup,
        address,
        state,
        pincode,
        bankAccountName: bankAccountName || null,
        bankAccountNo: bankAccountNo || null,
        bankAccountIFSC: bankAccountIFSC || null,
        bankAccountUPI: bankAccountUPI || null,
        registeredBloodBankId,
      },
    });

    return { user, donor };
  });

  if (email) {
    try {
      await emailService.sendDonorRegistration(email, name, donorDisplayId, tempPassword);
    } catch {}
  }

  return result.donor;
}

// BBA edits donor details (Module 6)
async function updateDonor(donorId, data) {
  const { name, age, sex, nationality, mobile, weight, bloodGroup,
    address, state, pincode, bankAccountName, bankAccountNo, bankAccountIFSC, bankAccountUPI } = data;

  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });

  return prisma.donor.update({
    where: { id: donorId },
    data: {
      name, age: parseInt(age), sex,
      nationality: nationality || 'Indian',
      mobile, weight: parseFloat(weight),
      bloodGroup, address, state, pincode,
      bankAccountName: bankAccountName || null,
      bankAccountNo: bankAccountNo || null,
      bankAccountIFSC: bankAccountIFSC || null,
      bankAccountUPI: bankAccountUPI || null,
    },
  });
}

// BBA authenticates (activates/suspends) donor (Module 6)
async function setDonorAuthStatus(donorId, isActive) {
  const donor = await prisma.donor.findUnique({ where: { id: donorId }, select: { userId: true } });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });
  await prisma.user.update({ where: { id: donor.userId }, data: { isActive } });
  return { message: isActive ? 'Donor authenticated and activated' : 'Donor suspended' };
}

module.exports = { listDonors, getDonor, getDonorCards, getEligiblePatients, selectPatient, createDonor, updateDonor, setDonorAuthStatus };
