const { z } = require('zod');

const createDonation = z.object({
  donorId: z.string().uuid(),
  patientId: z.string().uuid(),
  beneficiaryBankId: z.string().uuid(), // patient's blood bank
  bloodGroup: z.string(),
  organisationOfDrive: z.string().optional(),
  donationDate: z.string().datetime().optional(),
});

module.exports = { createDonation };
