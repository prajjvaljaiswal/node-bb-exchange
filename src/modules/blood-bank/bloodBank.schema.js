const { z } = require('zod');

const updateBank = z.object({
  name: z.string().min(3).optional(),
  registrationNo: z.string().optional(),
  registrationValidUpto: z.string().datetime().optional(),
  gstNo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().length(6).optional(),
  contactMobile: z.string().length(10).optional(),
  email: z.string().email().optional(),
  bankAccountName: z.string().optional(),
  bankAccountIFSC: z.string().optional(),
  bankAccountUPI: z.string().optional(),
});

const createAdmin = z.object({
  name: z.string().min(3),
  designation: z.string().min(2),
  mobile: z.string().length(10),
  email: z.string().email(),
  password: z.string().min(8),
  isPrimary: z.boolean().default(false),
});

const updateAdminStatus = z.object({
  authStatus: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']),
});

module.exports = { updateBank, createAdmin, updateAdminStatus };
