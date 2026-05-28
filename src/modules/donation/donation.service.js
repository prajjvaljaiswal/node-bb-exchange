const prisma = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const cycleService = require('../../services/cycle.service');
const emailService = require('../../services/email.service');
const { getIO } = require('../../config/socket');
const { getPaginationParams, paginatedResponse } = require('../../utils/pagination');
const { MIN_DONATION_INTERVAL_DAYS, MIN_DONOR_WEIGHT_KG, MIN_DONOR_AGE } = require('../../config/constants');

async function validateDonorEligibility(donor) {
  if (donor.age < MIN_DONOR_AGE) {
    throw Object.assign(new Error(`Donor must be at least ${MIN_DONOR_AGE} years old`), { status: 400, code: 'INELIGIBLE_DONOR' });
  }
  if (donor.weight < MIN_DONOR_WEIGHT_KG) {
    throw Object.assign(new Error(`Donor weight must be at least ${MIN_DONOR_WEIGHT_KG}kg`), { status: 400, code: 'INELIGIBLE_DONOR' });
  }
  if (donor.lastDonationAt) {
    const daysSince = (Date.now() - new Date(donor.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < MIN_DONATION_INTERVAL_DAYS) {
      throw Object.assign(new Error(`Donor must wait ${MIN_DONATION_INTERVAL_DAYS} days between donations. Last donation was ${Math.floor(daysSince)} days ago.`), { status: 400, code: 'DONATION_TOO_RECENT' });
    }
  }
}

async function createDonation(data, staffAdminId, donatingBankId) {
  const { donorId, patientId, organisationOfDrive, donationDate, donationType, remarks } = data;

  // 1. Validate donor
  const donor = await prisma.donor.findUnique({ where: { id: donorId } });
  if (!donor) throw Object.assign(new Error('Donor not found'), { status: 404, code: 'NOT_FOUND' });
  await validateDonorEligibility(donor);

  // 2. Validate patient
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { registeredBloodBank: { select: { id: true, name: true } } },
  });
  if (!patient || patient.status !== 'ACTIVE') {
    throw Object.assign(new Error('Patient not available'), { status: 400, code: 'PATIENT_UNAVAILABLE' });
  }

  const bloodGroup = data.bloodGroup || donor.bloodGroup;
  const beneficiaryBankId = data.beneficiaryBankId || patient.registeredBloodBankId;
  if (!beneficiaryBankId) {
    throw Object.assign(new Error('Patient has no registered blood bank'), { status: 400, code: 'MISSING_BENEFICIARY_BANK' });
  }

  // 3. Generate IDs
  const donorCardDisplayId = `DC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const bloodUnitNo = `BU-${donatingBankId.substr(0, 8).toUpperCase()}-${Date.now()}`;
  const donationDate_ = donationDate ? new Date(donationDate) : new Date();

  const BLOOD_EXPIRY_DAYS = 35;
  const expirationDate = new Date(donationDate_);
  expirationDate.setDate(expirationDate.getDate() + BLOOD_EXPIRY_DAYS);

  // 4. Create all records in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Donor card
    const donorCard = await tx.donorCard.create({
      data: {
        donorCardDisplayId,
        donorId: donorId,
        donorName: donor.name,
        bloodBankId: donatingBankId,
        bloodBankName: '', // will fill after bank fetch
        bloodGroup,
        bloodUnitNo,
        dateOfCollection: donationDate_,
        organisationOfDrive,
        status: 'ISSUED',
      },
    });

    // Donor-Card link
    await tx.donorCard_Donor.create({
      data: { donorCardId: donorCard.id, donorId },
    });

    // Update donor card with bank name and authority signature
    const bank = await tx.bloodBank.findUnique({ where: { id: donatingBankId }, select: { name: true } });
    const staffAdmin = staffAdminId
      ? await tx.bloodBankAdmin.findUnique({ where: { id: staffAdminId }, select: { name: true } })
      : null;
    await tx.donorCard.update({
      where: { id: donorCard.id },
      data: {
        bloodBankName: bank?.name || '',
        bloodBankAuthoritySignature: staffAdmin?.name || null,
      },
    });

    // Whole blood inventory
    const wholeBlood = await tx.wholeBloodInventory.create({
      data: {
        donorCardId: donorCard.id,
        bloodUnitNo,
        bloodGroup,
        dateOfCollection: donationDate_,
        dateOfExpiration: expirationDate,
        bloodBankId: donatingBankId,
        status: 'PENDING_TESTING',
      },
    });

    // Update donor card status
    await tx.donorCard.update({
      where: { id: donorCard.id },
      data: { status: 'IN_WHOLE_BLOOD' },
    });

    // Balance sheet entries
    // Receivable: patientBank is owed blood by donatingBank (donatingBank gains credit)
    const receivable = await tx.balanceSheetEntry.create({
      data: {
        creditorBankId: donatingBankId,  // donatingBank is owed
        debtorBankId: beneficiaryBankId, // patientBank owes
        donorCardId: donorCard.id,
        bloodGroup,
        units: 1,
        entryType: 'RECEIVABLE',
        status: 'ACTIVE',
        patientId,
      },
    });

    // Deliverable: donatingBank owes to patientBank (they need to deliver)
    const deliverable = await tx.balanceSheetEntry.create({
      data: {
        creditorBankId: beneficiaryBankId, // patientBank is the creditor (will receive)
        debtorBankId: donatingBankId,      // donatingBank is the debtor (must deliver)
        donorCardId: donorCard.id,
        bloodGroup,
        units: 1,
        entryType: 'DELIVERABLE',
        status: 'ACTIVE',
        patientId,
      },
    });

    // Donation event
    const donationEvent = await tx.donationEvent.create({
      data: {
        donorId,
        donorCardId: donorCard.id,
        bloodBankId: donatingBankId,
        beneficiaryBankId,
        patientId,
        staffAdminId,
        donationDate: donationDate_,
        donationType: donationType || 'VOLUNTARY',
        remarks: remarks || null,
      },
    });

    // Update donor last donation date
    await tx.donor.update({
      where: { id: donorId },
      data: { lastDonationAt: donationDate_ },
    });

    return { donorCard, wholeBlood, donationEvent, receivable, deliverable };
  });

  // 5. Cycle detection (outside transaction for performance)
  const cycle = await cycleService.detectAndSettleCycle(
    donatingBankId,
    beneficiaryBankId,
    result.donationEvent.id,
    result.donorCard.id
  );

  if (cycle.found) {
    await cycleService.settleCycle(cycle, result.donationEvent.id);
    await cycleService.triggerCycleRefunds(result.donationEvent.id, cycle.path);

    // Emit real-time event
    try {
      const io = getIO();
      io.to('platform:admin').emit('cycle.detected', {
        path: cycle.path,
        donationEventId: result.donationEvent.id,
        bloodGroup,
      });
      io.to(`bank:${donatingBankId}`).emit('cycle.detected', { path: cycle.path });
    } catch {}
  } else {
    // Add to recommendation list
    await cycleService.addToRecommendations(
      result.donorCard.id, patientId, donatingBankId, beneficiaryBankId
    );
  }

  // 6. Send email confirmation
  try {
    await emailService.sendDonationConfirmation(donor.email, donor.name, donorCardDisplayId, patient.name);
  } catch {}

  // Emit to dashboard
  try {
    const io = getIO();
    io.to('platform:admin').emit('donation.logged', {
      donorName: donor.name,
      bloodGroup,
      bloodBankId: donatingBankId,
    });
  } catch {}

  return {
    donorCard: result.donorCard,
    donationEvent: result.donationEvent,
    cycleDetected: cycle.found,
    cyclePath: cycle.found ? cycle.path : null,
  };
}

async function listDonations(query, user) {
  const { page, limit, skip } = getPaginationParams(query);
  const where = {};
  if (user.role === 'BLOOD_BANK_ADMIN') where.bloodBankId = user.bloodBankId;
  if (query.bloodBankId) where.bloodBankId = query.bloodBankId;
  if (query.from) where.donationDate = { gte: new Date(query.from) };
  if (query.to) where.donationDate = { ...where.donationDate, lte: new Date(query.to) };

  const [total, items] = await Promise.all([
    prisma.donationEvent.count({ where }),
    prisma.donationEvent.findMany({
      where, skip, take: limit,
      orderBy: { donationDate: 'desc' },
      include: {
        donor: { select: { name: true, bloodGroup: true } },
        patient: { select: { name: true, patientDisplayId: true } },
        donorCard: { select: { donorCardDisplayId: true, bloodGroup: true } },
      },
    }),
  ]);
  return paginatedResponse(items, total, page, limit);
}

async function getDonation(id) {
  const donation = await prisma.donationEvent.findUnique({
    where: { id },
    include: {
      donor: true,
      patient: true,
      donorCard: true,
      bloodBank: { select: { id: true, name: true } },
      beneficiaryBank: { select: { id: true, name: true } },
      balanceEntries: true,
    },
  });
  if (!donation) throw Object.assign(new Error('Donation not found'), { status: 404, code: 'NOT_FOUND' });
  return donation;
}

module.exports = { createDonation, listDonations, getDonation };
