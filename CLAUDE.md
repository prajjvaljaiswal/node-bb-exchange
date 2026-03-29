# CLAUDE.md — Backend

This file provides guidance to Claude Code when working in `backend/`.
Context files live one level up at `../`.

---

## Startup Sequence (every session, in this order)

1. Read `../BASE_CONTEXT.md`
2. Read `../PROJECT_CONTEXT.md` — check `<!-- WIP -->` and `<!-- HANDOFF -->` tags
3. Read the contract file(s) for what you are touching today:

| Touching | Read |
|----------|------|
| Any endpoint or response shape | `../API_CONTRACTS.md` |
| Any Socket.IO event | `../WS_PROTOCOL.md` |
| Any Prisma model or Redis key | `../SCHEMA_STATE.md` |

---

## After Any Code Change

| Changed | Update |
|---------|--------|
| Route path, method, param, or response shape | `../API_CONTRACTS.md` |
| Socket.IO event name or payload | `../WS_PROTOCOL.md` |
| Prisma model, enum, or Redis key | `../SCHEMA_STATE.md` |
| Feature status | `../PORTAL_CAPABILITIES.md` backend column |
| Anything | `../PROJECT_CONTEXT.md` file change log |
| Anything | `../SESSION_LOG.md` session entry |

Cross-side handoff — when a change affects frontend, append to `../PROJECT_CONTEXT.md`:
```
<!-- HANDOFF -->
### Handoff — YYYY-MM-DD [BE→FE]
Changed: <file>
Impact: <what FE needs to know>
Action: <task or "informational only">
```

---

## Commands

```bash
# Development
npm run dev           # Start with nodemon (auto-reload)
npm start             # Start production server

# Database
npm run db:push       # Push schema to DB (no migration history)
npm run db:migrate    # Create and apply migration
npm run db:seed       # Seed initial data
npm run db:studio     # Open Prisma Studio GUI
npm run setup:dev     # db:push + db:seed (first-time dev setup)
```

No test suite is configured. There is no lint script.

---

## Environment Variables

Required in `.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_URL` — for CORS origin
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `SMTP_*` — nodemailer config
- `NODE_ENV`, `PORT`
- `DEV_MODE=true` — enables in-memory mocks (see below)

---

## Dev Mode

Set `DEV_MODE=true` to replace Redis, Razorpay, and Nodemailer with in-memory mocks defined in `src/config/devMocks.js`. Emails are logged to console. Razorpay returns fake order/refund IDs. Redis is replaced with a `Map`-based store with TTL support.

---

## Architecture

Express + Prisma (PostgreSQL) + Socket.IO + Redis + Razorpay.

### Module Structure

All feature modules live in `src/modules/<name>/` with four files:
- `*.routes.js` — Express router, applies `authenticate`/`authorize` middleware
- `*.controller.js` — calls service, responds via `sendSuccess`/`sendCreated`/`sendError`
- `*.service.js` — business logic, Prisma queries
- `*.schema.js` — Zod validation schemas (used by `validate` middleware)

Shared services in `src/services/`: `cycle.service.js`, `email.service.js`, `pdf.service.js`, `razorpay.service.js`.

### Auth & RBAC

JWT access tokens (Bearer) + refresh tokens stored in DB. Redis blacklists revoked tokens (`blacklist:token:<token>`). Four roles: `PLATFORM_ADMIN`, `BLOOD_BANK_ADMIN`, `DONOR`, `PATIENT`. Middleware chain: `authenticate` → `authorize(...roles)` → optionally `requireEmailVerified`.

### Response Format

Always use `sendSuccess(res, data)`, `sendCreated(res, data)`, or `sendError(res, statusCode, code, message)` from `src/utils/responseFormatter.js`. All responses are `{ success: true, data }` or `{ success: false, error: { code, message } }`.

### Core Domain Flow

1. **Donation**: A donor donates at a blood bank (donating bank) for a patient registered at another bank (beneficiary bank). Creates `DonorCard` → `WholeBloodInventory` (pending TTI testing) → two `BalanceSheetEntry` records (one RECEIVABLE, one DELIVERABLE).
2. **Cycle Detection**: After every donation, `cycle.service.js` runs BFS on the deliverables graph to detect if a blood-exchange cycle has formed between banks. If found, all entries in the cycle are settled (`SETTLED`) and transfer fees are refunded via Razorpay.
3. **Inventory**: After TTI passes, whole blood is separated into `PRBCInventory`. PRBC units can be reserved for patients, transferred between banks, or used directly.
4. **Transfers**: Two-form process — `TransferFormA` (request) → `TransferFormAResponse` (accept/reject) → `TransferFormB` (dispatch with PRBC units) → `TransferFormBResponse` (delivery confirmation).
5. **Payments**: Razorpay orders for patient registration fees, transfer fees, and PRBC purchase. Webhooks capture payment status.

### Distributed Locking

`src/middleware/lock.js` exports `withLock(resources, ttl, fn)`. Uses Redlock (Redis) in production; falls back to in-memory mutex in `DEV_MODE`. Always sort lock keys before acquiring to prevent deadlocks (already done in `cycle.service.js`).

### Real-time Events

Socket.IO rooms: `platform:admin` and `bank:<bloodBankId>`. Events emitted on donation creation (`donation.logged`), cycle detection (`cycle.detected`), and inventory changes.

### Cron Jobs

Nightly at 23:59 IST: generates balance sheet PDFs per active blood bank and emails them. Timezone controlled by `REPORT_CRON_TIMEZONE` env var (default `Asia/Kolkata`).

### Audit Log

`src/middleware/auditLog.js` logs all mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) to the `audit_logs` table with user ID, IP, and request metadata.

---

## Rules

1. `../arch_plan_raw.txt` is the master design reference — never contradict it
2. `../plans/` folder governs all algorithm logic — defer to it first
3. Never delete existing info from context files — only append, update, or clarify
4. Never modify frontend source files
5. Context files must always reflect real state — fix stale entries, never leave them
6. Never duplicate content that already exists in another context file
7. Do not modify backend logic unless explicitly asked
