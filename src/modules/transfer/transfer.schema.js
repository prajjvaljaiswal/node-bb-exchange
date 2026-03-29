const { z } = require('zod');

const createFormA = z.object({
  supplierBankId: z.string().uuid(),
  patientId: z.string().uuid().optional(),
  bloodGroup: z.string(),
  unitsRequested: z.number().int().min(1),
  urgencyLevel: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});

const respondFormA = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  unitsCommitted: z.number().int().min(1).optional(),
  rejectionReason: z.string().optional(),
});

const createFormB = z.object({
  formAId: z.string().uuid(),
  prbcUnitIds: z.array(z.string().uuid()).min(1),
  transportDetails: z.object({
    vehicleNo: z.string().optional(),
    driverName: z.string().optional(),
    contactNo: z.string().optional(),
    transportCompany: z.string().optional(),
  }).optional(),
  dispatchDate: z.string().datetime().optional(),
  expectedArrivalDate: z.string().datetime().optional(),
});

const receiveFormB = z.object({
  unitsReceived: z.number().int().min(0),
  discrepancyNotes: z.string().optional(),
});

module.exports = { createFormA, respondFormA, createFormB, receiveFormB };
