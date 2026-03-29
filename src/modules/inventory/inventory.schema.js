const { z } = require('zod');

const ttiResults = z.object({
  ttiSyphilis: z.enum(['PENDING', 'PASSED', 'FAILED']),
  ttiMalaria:  z.enum(['PENDING', 'PASSED', 'FAILED']),
  ttiHIV:      z.enum(['PENDING', 'PASSED', 'FAILED']),
  ttiHBV:      z.enum(['PENDING', 'PASSED', 'FAILED']),
  ttiHCV:      z.enum(['PENDING', 'PASSED', 'FAILED']),
});

module.exports = { ttiResults };
