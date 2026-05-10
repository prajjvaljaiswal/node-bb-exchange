const { z } = require('zod');

const createDonation = z.object({
  donorId: z.string().uuid(),
  patientId: z.string().uuid(),
  beneficiaryBankId: z.string().uuid().optional(), // derived from patient.registeredBloodBankId if omitted
  bloodGroup: z.string().optional(),               // derived from donor.bloodGroup if omitted
  organisationOfDrive: z.string().optional(),
  donationDate: z.string().datetime().optional(),
});

module.exports = { createDonation };
