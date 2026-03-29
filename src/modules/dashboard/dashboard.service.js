const prisma = require('../../config/database');

async function platformAdminDashboard() {
  const [
    totalBanks,
    activeBanks,
    totalDonors,
    totalPatients,
    totalDonorCards,
    pendingTransfers,
    recentDonations,
    paymentsSum,
  ] = await Promise.all([
    prisma.bloodBank.count(),
    prisma.bloodBank.count({ where: { isActive: true } }),
    prisma.donor.count(),
    prisma.patient.count({ where: { status: 'ACTIVE' } }),
    prisma.donorCard.count({ where: { status: { notIn: ['EXPIRED', 'USED'] } } }),
    prisma.transferFormA.count({ where: { status: { in: ['SENT', 'ACKNOWLEDGED'] } } }),
    prisma.donationEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.payment.aggregate({
      where: { status: 'CAPTURED' },
      _sum: { amount: true },
    }),
  ]);

  return {
    kpis: {
      totalBanks,
      activeBanks,
      totalDonors,
      totalPatients,
      activeDonorCards: totalDonorCards,
      pendingTransfers,
      totalRevenueINR: (paymentsSum._sum.amount || 0) / 100,
    },
    recentDonations,
  };
}

async function bloodBankDashboard(bankId) {
  const [
    prbcCount,
    donorCount,
    patientCount,
    pendingTransfers,
    recentDonations,
    receivables,
    deliverables,
  ] = await Promise.all([
    prisma.pRBCInventory.count({ where: { bloodBankId: bankId, status: 'AVAILABLE' } }),
    prisma.donorCard.count({ where: { bloodBankId: bankId, status: { notIn: ['EXPIRED', 'USED'] } } }),
    prisma.patient.count({ where: { registeredBloodBankId: bankId, status: 'ACTIVE' } }),
    prisma.transferFormA.count({ where: { supplierBankId: bankId, status: { in: ['SENT', 'ACKNOWLEDGED'] } } }),
    prisma.donationEvent.findMany({
      where: { bloodBankId: bankId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.balanceSheetEntry.count({ where: { creditorBankId: bankId, status: 'ACTIVE' } }),
    prisma.balanceSheetEntry.count({ where: { debtorBankId: bankId, status: 'ACTIVE' } }),
  ]);

  return {
    kpis: { prbcCount, donorCount, patientCount, pendingTransfers },
    balancePosition: { receivables, deliverables, net: receivables - deliverables },
    recentDonations,
  };
}

module.exports = { platformAdminDashboard, bloodBankDashboard };
