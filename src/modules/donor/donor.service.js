const prisma = require('../../config/database');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');
const { getCompatibleDonorGroups } = require('../../utils/bloodGroup');

async function listDonors(query) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
  if (query.state) where.state = query.state;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.donor.count({ where }),
    prisma.donor.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function getDonor(id) {
  const donor = await prisma.donor.findUnique({
    where: { id },
    include: { _count: { select: { donorCards: true, donations: true } } },
  });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });
  return donor;
}

async function getDonorCards(donorId) {
  return prisma.donorCard.findMany({
    where: { donorLink: { donorId } },
    include: { bloodBank: { select: { id: true, name: true, city: true } } },
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
      unitsRequired: true, hospitalName: true, disease: true,
      registeredBloodBank: { select: { id: true, name: true, city: true, state: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
}

async function selectPatient(donorId, patientId) {
  // This nominates donor intent — actual donation logged by blood bank staff
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.status !== 'ACTIVE') {
    throw Object.assign(new Error('Patient not available'), { status: 400, code: 'PATIENT_UNAVAILABLE' });
  }
  return { message: 'Patient selected. Please visit the blood bank to donate.', patient };
}

module.exports = { listDonors, getDonor, getDonorCards, getEligiblePatients, selectPatient };
