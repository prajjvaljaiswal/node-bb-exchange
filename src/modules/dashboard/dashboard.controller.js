const service = require('./dashboard.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function platformAdminDashboard(req, res, next) {
  try {
    const data = await service.platformAdminDashboard();
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function bloodBankDashboard(req, res, next) {
  try {
    const data = await service.bloodBankDashboard(req.params.bankId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

module.exports = { platformAdminDashboard, bloodBankDashboard };
