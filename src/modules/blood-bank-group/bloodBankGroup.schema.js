const { z } = require('zod');

const createGroup = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  state: z.string().min(2),
});

const addMember = z.object({
  bloodBankId: z.string().uuid(),
});

module.exports = { createGroup, addMember };
