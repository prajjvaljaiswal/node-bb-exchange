const prisma = require('../config/database');
const redis = require('../config/redis');
const { withLock } = require('../middleware/lock');
const emailService = require('./email.service');

/**
 * Cycle Detection Algorithm
 *
 * Graph: nodes = blood_banks, directed edges = balance_sheet_entries
 *        edge A→B means "A has receivable FROM B" (B owes blood to A)
 *
 * After donation creates edge: donatingBank → patientBank
 * We do BFS from donatingBank, check if we can reach back to patientBank
 * This means: patientBank owes blood to someone, who owes to someone, ... who is donatingBank
 *
 * Actually the cycle is:
 * donorBank donates for patient at patientBank
 * → creates receivable: patientBank owes donorBank
 * → creates deliverable: donorBank owes patientBank
 * BFS on deliverables graph from patientBank to find path back to donorBank
 */

async function detectAndSettleCycle(donatingBankId, patientBankId, donationEventId, donorCardId) {
  // Build the deliverables graph (B owes A means edge B→A)
  // We want to find if patientBankId can reach donatingBankId via deliverables chain
  // i.e., starting from patientBankId, follow "who does this bank owe to" edges

  const activeEntries = await prisma.balanceSheetEntry.findMany({
    where: { status: 'ACTIVE', entryType: 'DELIVERABLE' },
    select: { debtorBankId: true, creditorBankId: true, id: true, donorCardId: true },
  });

  // adjacency list: debtorBank → [creditorBanks]
  const adj = {};
  for (const e of activeEntries) {
    if (!adj[e.debtorBankId]) adj[e.debtorBankId] = [];
    adj[e.debtorBankId].push({ to: e.creditorBankId, entryId: e.id, donorCardId: e.donorCardId });
  }

  // BFS from patientBankId to find donatingBankId
  const visited = new Set();
  const queue = [{ bankId: patientBankId, path: [patientBankId], entryIds: [], cardIds: [] }];

  while (queue.length > 0) {
    const { bankId, path, entryIds, cardIds } = queue.shift();

    if (visited.has(bankId)) continue;
    visited.add(bankId);

    const neighbors = adj[bankId] || [];
    for (const neighbor of neighbors) {
      if (neighbor.to === donatingBankId) {
        // CYCLE FOUND!
        const cyclePath = [...path, donatingBankId];
        const cycleEntryIds = [...entryIds, neighbor.entryId];
        const cycleCardIds = [...cardIds, neighbor.donorCardId].filter(Boolean);
        return { found: true, path: cyclePath, entryIds: cycleEntryIds, cardIds: cycleCardIds };
      }

      if (!visited.has(neighbor.to)) {
        queue.push({
          bankId: neighbor.to,
          path: [...path, neighbor.to],
          entryIds: [...entryIds, neighbor.entryId],
          cardIds: [...cardIds, neighbor.donorCardId],
        });
      }
    }
  }

  return { found: false };
}

async function settleCycle(cycleData, donationEventId) {
  const { path, entryIds, cardIds } = cycleData;

  // Sort bank IDs for consistent lock ordering (prevents deadlock)
  const bankIds = [...new Set(path)].sort();
  const lockKeys = bankIds.map(id => `bank:${id}`);

  return withLock(lockKeys, 30000, async () => {
    return prisma.$transaction(async (tx) => {
      // Settle all balance sheet entries in the cycle
      await tx.balanceSheetEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { status: 'SETTLED' },
      });

      // Mark donor cards as transferred
      if (cardIds.length > 0) {
        await tx.donorCard.updateMany({
          where: { id: { in: cardIds } },
          data: { status: 'TRANSFERRED' },
        });
      }

      // Update donation event
      await tx.donationEvent.update({
        where: { id: donationEventId },
        data: { cycleDetected: true },
      });

      return { settled: entryIds.length, path };
    });
  });
}

async function triggerCycleRefunds(donationEventId, path) {
  // Find the original transfer payment for this cycle
  const payment = await prisma.payment.findFirst({
    where: { donationEventId, paymentType: 'TRANSFER_FEE', status: 'CAPTURED' },
  });

  if (!payment) return; // No fee to refund

  try {
    const razorpayService = require('./razorpay.service');
    await razorpayService.issueRefund(payment.razorpayPaymentId, 54900); // Full INR 549 refund

    // Record cycle refund payment
    const { v4: uuidv4 } = require('uuid');
    await prisma.payment.create({
      data: {
        paymentDisplayId: `RFND-${Date.now()}`,
        amount: 54900,
        paymentType: 'CYCLE_REFUND',
        status: 'REFUNDED',
        donationEventId,
        metadata: { cyclePath: path, originalPaymentId: payment.id },
      },
    });

    await prisma.donationEvent.update({
      where: { id: donationEventId },
      data: { cycleRefundIssued: true },
    });
  } catch (err) {
    console.error('[cycle] Refund failed:', err.message);
  }
}

async function addToRecommendations(donorCardId, patientId, donatingBankId, patientBankId) {
  // Direct recommendation (hop 0) — go to donating bank
  const existingCount = await prisma.recommendationNode.count({ where: { forPatientId: patientId } });

  await prisma.recommendationNode.create({
    data: {
      forPatientId: patientId,
      forBloodBankId: donatingBankId,
      donorCardId,
      hops: donatingBankId === patientBankId ? 0 : 1,
      chainPath: { path: [donatingBankId, patientBankId] },
      displayOrder: existingCount + 1,
    },
  });
}

module.exports = { detectAndSettleCycle, settleCycle, triggerCycleRefunds, addToRecommendations };
