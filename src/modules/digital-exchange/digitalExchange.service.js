const { Prisma } = require('@prisma/client');
const prisma = require('../../config/database');
const { withLock } = require('../../middleware/lock');
const { getIO } = require('../../config/socket');

async function proposeBilateral(data, initiatingBankId) {
  const { partnerBankId, f1EntryId, f2EntryId } = data;

  // Validate entries exist and are active
  const [e1, e2] = await Promise.all([
    prisma.balanceSheetEntry.findUnique({ where: { id: f1EntryId } }),
    prisma.balanceSheetEntry.findUnique({ where: { id: f2EntryId } }),
  ]);

  if (!e1 || !e2 || e1.status !== 'ACTIVE' || e2.status !== 'ACTIVE') {
    throw Object.assign(new Error('One or more entries are not active'), { status: 400, code: 'INVALID_ENTRIES' });
  }

  return prisma.digitalExchangeEvent.create({
    data: {
      exchangeType: 'BILATERAL',
      initiatedByBankId: initiatingBankId,
      participantBanks: [initiatingBankId, partnerBankId],
      balanceSheetChanges: {
        before: { f1Entry: e1, f2Entry: e2 },
        entryIds: [f1EntryId, f2EntryId],
      },
      status: 'PROPOSED',
    },
  });
}

async function executeBilateral(proposalId, executingBankId) {
  const proposal = await prisma.digitalExchangeEvent.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== 'PROPOSED') {
    throw Object.assign(new Error('Proposal not found or not in PROPOSED state'), { status: 400, code: 'INVALID_PROPOSAL' });
  }

  const { entryIds } = proposal.balanceSheetChanges;
  const [e1, e2] = await Promise.all([
    prisma.balanceSheetEntry.findUnique({ where: { id: entryIds[0] } }),
    prisma.balanceSheetEntry.findUnique({ where: { id: entryIds[1] } }),
  ]);

  const bankIds = [...new Set([e1.debtorBankId, e1.creditorBankId, e2.debtorBankId, e2.creditorBankId])].sort();

  return withLock(bankIds, 30000, async () => {
    return prisma.$transaction(async (tx) => {
      // Swap: e1 debtorBank takes on e2's debt, e2 debtorBank takes on e1's debt
      const e1NewDebtorId = e2.debtorBankId;
      const e2NewDebtorId = e1.debtorBankId;

      await tx.balanceSheetEntry.update({
        where: { id: e1.id },
        data: { debtorBankId: e1NewDebtorId },
      });

      await tx.balanceSheetEntry.update({
        where: { id: e2.id },
        data: { debtorBankId: e2NewDebtorId },
      });

      const updated = await tx.digitalExchangeEvent.update({
        where: { id: proposalId },
        data: {
          status: 'EXECUTED',
          balanceSheetChanges: {
            before: proposal.balanceSheetChanges.before,
            after: { e1Debtor: e1NewDebtorId, e2Debtor: e2NewDebtorId },
            entryIds,
          },
        },
      });

      return updated;
    });
  });
}

async function proposeUnilateral(data, initiatingBankId) {
  const { takerBankId, giverBankId, creditorBankId, entryId } = data;

  const entry = await prisma.balanceSheetEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.status !== 'ACTIVE') {
    throw Object.assign(new Error('Entry not found or not active'), { status: 400, code: 'INVALID_ENTRY' });
  }

  return prisma.digitalExchangeEvent.create({
    data: {
      exchangeType: 'UNILATERAL',
      initiatedByBankId: initiatingBankId,
      participantBanks: [takerBankId, giverBankId, creditorBankId],
      balanceSheetChanges: {
        entryId,
        before: { debtorBankId: entry.debtorBankId, creditorBankId: entry.creditorBankId },
        takerBankId,
      },
      status: 'PROPOSED',
    },
  });
}

async function consentUnilateral(proposalId, consentingBankId) {
  return prisma.digitalExchangeEvent.update({
    where: { id: proposalId },
    data: { status: 'CONSENTED' },
  });
}

async function executeUnilateral(proposalId) {
  const proposal = await prisma.digitalExchangeEvent.findUnique({ where: { id: proposalId } });
  if (!proposal || proposal.status !== 'CONSENTED') {
    throw Object.assign(new Error('Proposal not consented'), { status: 400, code: 'NOT_CONSENTED' });
  }

  const { entryId, takerBankId } = proposal.balanceSheetChanges;
  const entry = await prisma.balanceSheetEntry.findUnique({ where: { id: entryId } });

  const bankIds = [...new Set([entry.debtorBankId, entry.creditorBankId, takerBankId])].sort();

  return withLock(bankIds, 30000, async () => {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.balanceSheetEntry.update({
        where: { id: entryId },
        data: { debtorBankId: takerBankId },
      });

      await tx.digitalExchangeEvent.update({
        where: { id: proposalId },
        data: {
          status: 'EXECUTED',
          balanceSheetChanges: {
            ...proposal.balanceSheetChanges,
            after: { debtorBankId: takerBankId },
          },
        },
      });

      return updated;
    });
  });
}

async function history(bankId) {
  return prisma.$queryRaw`
    SELECT * FROM digital_exchange_events
    WHERE initiatedByBankId = ${bankId}
       OR JSON_CONTAINS(participantBanks, ${JSON.stringify(bankId)}, '$')
    ORDER BY createdAt DESC
    LIMIT 50
  `;
}

module.exports = { proposeBilateral, executeBilateral, proposeUnilateral, consentUnilateral, executeUnilateral, history };
