const { z } = require('zod');

const bilateralPropose = z.object({
  partnerBankId: z.string().uuid(),
  // F1 owes L2, F2 owes L1 → swap → F1 owes L1, F2 owes L2
  f1EntryId: z.string().uuid(), // entry: F1 owes L2
  f2EntryId: z.string().uuid(), // entry: F2 owes L1
});

const unilateralPropose = z.object({
  takerBankId: z.string().uuid(),    // F1 taking liability
  giverBankId: z.string().uuid(),    // F2 giving up liability
  creditorBankId: z.string().uuid(), // L1 the creditor
  entryId: z.string().uuid(),        // entry: F2 owes L1
});

module.exports = { bilateralPropose, unilateralPropose };
