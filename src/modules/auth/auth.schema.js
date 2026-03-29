const { z } = require('zod');

const registerBloodBank = z.object({
  bankName: z.string().min(3),
  registrationNo: z.string().min(3),
  registrationValidUpto: z.string().datetime(),
  gstNo: z.string().optional(),
  address: z.string().min(10),
  city: z.string().min(2),
  district: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().length(6),
  contactMobile: z.string().length(10),
  bankEmail: z.string().email(),
  adminName: z.string().min(3),
  adminDesignation: z.string().min(2),
  adminMobile: z.string().length(10),
  email: z.string().email(),
  password: z.string().min(8),
});

const registerDonor = z.object({
  name: z.string().min(3),
  age: z.number().int().min(18).max(65),
  sex: z.enum(['Male', 'Female', 'Other']),
  mobile: z.string().length(10),
  email: z.string().email(),
  weight: z.number().min(50),
  bloodGroup: z.string(),
  address: z.string().min(10),
  state: z.string().min(2),
  pincode: z.string().length(6),
  password: z.string().min(8),
  bankAccountName: z.string().optional(),
  bankAccountIFSC: z.string().optional(),
  bankAccountUPI: z.string().optional(),
});

const registerPatient = z.object({
  name: z.string().min(3),
  age: z.number().int().min(0),
  sex: z.enum(['Male', 'Female', 'Other']),
  bloodGroup: z.string(),
  unitsRequired: z.number().int().min(1),
  hospitalName: z.string().min(3),
  doctorName: z.string().min(3),
  disease: z.string().optional(),
  contactPerson1: z.string().optional(),
  contactPerson2: z.string().optional(),
  contactPerson3: z.string().optional(),
  mobile: z.string().length(10),
  email: z.string().email(),
  modeOfPayment: z.enum(['ONLINE', 'CASH', 'CHEQUE', 'NEFT']).default('ONLINE'),
  bankAccountName: z.string().optional(),
  bankAccountIFSC: z.string().optional(),
  bankAccountUPI: z.string().optional(),
  registeredBloodBankId: z.string().uuid().optional(),
  password: z.string().min(8),
});

const login = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmail = z.object({
  token: z.string().min(1),
});

const forgotPassword = z.object({
  email: z.string().email(),
});

const resetPassword = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

module.exports = { registerBloodBank, registerDonor, registerPatient, login, verifyEmail, forgotPassword, resetPassword };
