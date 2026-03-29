const prisma = require('../config/database');

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function auditLog(req, res, next) {
  if (!MUTATING_METHODS.includes(req.method) || !req.user) return next();

  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    if (body?.success && req.user) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: `${req.method} ${req.path}`,
            entityType: extractEntityType(req.path),
            entityId: req.params?.id || null,
            ipAddress: req.ip,
            diff: body.data ? JSON.parse(JSON.stringify(body.data)) : null,
          },
        });
      } catch (e) {
        console.error('[audit] Failed to write audit log:', e.message);
      }
    }
    return originalJson(body);
  };

  next();
}

function extractEntityType(path) {
  const parts = path.split('/').filter(Boolean);
  return parts[2] || 'unknown';
}

module.exports = auditLog;
