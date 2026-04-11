const { verifyAccessToken } = require('../utils/tokenUtils');
const redis = require('../config/redis');
const { sendError } = require('../utils/responseFormatter');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const token = authHeader.split(' ')[1];
  try {
    const blacklisted = await redis.get(`blacklist:token:${token}`);
    if (blacklisted) return sendError(res, 401, 'TOKEN_REVOKED', 'Token has been revoked');

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    console.log(err)
    return sendError(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}

function requireEmailVerified(req, res, next) {
  if (!req.user.isEmailVerified) {
    return sendError(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first');
  }
  next();
}

module.exports = { authenticate, authorize, requireEmailVerified };
