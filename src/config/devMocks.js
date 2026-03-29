/**
 * DEV MODE MOCKS
 * When DEV_MODE=true, these replace real third-party services.
 * Safe to use without internet, API keys, or Redis.
 */

const { v4: uuidv4 } = require('uuid');

const IS_DEV = process.env.DEV_MODE === 'true';

// ─────────────────────────────────────────────────────────
// RAZORPAY MOCK
// ─────────────────────────────────────────────────────────

const mockRazorpay = {
  orders: {
    create: async ({ amount, currency, receipt, notes }) => {
      const orderId = `order_DEV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      console.log(`[DEV] Razorpay.orders.create — orderId=${orderId} amount=${amount} currency=${currency}`);
      return { id: orderId, amount, currency, receipt, status: 'created', notes };
    },
  },
  payments: {
    refund: async (paymentId, { amount }) => {
      const refundId = `rfnd_DEV_${Date.now()}`;
      console.log(`[DEV] Razorpay.payments.refund — paymentId=${paymentId} amount=${amount} refundId=${refundId}`);
      return { id: refundId, payment_id: paymentId, amount, status: 'processed' };
    },
    fetch: async (paymentId) => {
      console.log(`[DEV] Razorpay.payments.fetch — paymentId=${paymentId}`);
      return { id: paymentId, status: 'captured', amount: 10000, currency: 'INR' };
    },
  },
};

// ─────────────────────────────────────────────────────────
// NODEMAILER MOCK
// ─────────────────────────────────────────────────────────

const mockMailTransporter = {
  sendMail: async ({ from, to, subject, html, attachments }) => {
    console.log('\n─────────────────────────────────────');
    console.log('[DEV EMAIL]');
    console.log(`  From   : ${from}`);
    console.log(`  To     : ${to}`);
    console.log(`  Subject: ${subject}`);
    if (attachments?.length) console.log(`  Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    console.log('─────────────────────────────────────\n');
    return { messageId: `dev_${Date.now()}@bloodexchange.local` };
  },
  verify: (cb) => cb(null), // always healthy in dev
};

// ─────────────────────────────────────────────────────────
// REDIS MOCK (in-memory, for session blacklist + rate limiting)
// ─────────────────────────────────────────────────────────

const _store = new Map();
const _timers = new Map();

const mockRedis = {
  get: async (key) => _store.get(key) ?? null,
  set: async (key, val) => { _store.set(key, val); return 'OK'; },
  setex: async (key, ttl, val) => {
    _store.set(key, val);
    if (_timers.has(key)) clearTimeout(_timers.get(key));
    _timers.set(key, setTimeout(() => _store.delete(key), ttl * 1000));
    return 'OK';
  },
  del: async (key) => { _store.delete(key); return 1; },
  exists: async (key) => _store.has(key) ? 1 : 0,
  expire: async (key, ttl) => {
    if (_timers.has(key)) clearTimeout(_timers.get(key));
    _timers.set(key, setTimeout(() => _store.delete(key), ttl * 1000));
    return 1;
  },
  // List operations for FIFO queue
  lpush: async (key, ...vals) => {
    const arr = _store.get(key) || [];
    arr.unshift(...vals);
    _store.set(key, arr);
    return arr.length;
  },
  rpop: async (key) => {
    const arr = _store.get(key) || [];
    const val = arr.pop();
    _store.set(key, arr);
    return val ?? null;
  },
  on: () => {}, // no-op event listener
};

// ─────────────────────────────────────────────────────────
// REDLOCK MOCK (in-memory mutex, single-process safe)
// ─────────────────────────────────────────────────────────

const _locks = new Map();

async function mockWithLock(resources, ttl, fn) {
  const key = [...resources].sort().join('|');
  // Wait if locked (simple polling, good enough for dev)
  const start = Date.now();
  while (_locks.has(key)) {
    if (Date.now() - start > ttl) throw new Error(`[DEV] Lock timeout: ${key}`);
    await new Promise(r => setTimeout(r, 50));
  }
  _locks.set(key, true);
  const timer = setTimeout(() => _locks.delete(key), ttl);
  try {
    return await fn();
  } finally {
    clearTimeout(timer);
    _locks.delete(key);
  }
}

module.exports = { IS_DEV, mockRazorpay, mockMailTransporter, mockRedis, mockWithLock };
