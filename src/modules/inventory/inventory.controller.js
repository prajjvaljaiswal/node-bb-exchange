const service = require('./inventory.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function listWholeBlood(req, res, next) {
  try {
    const result = await service.listWholeBlood(req.params.bankId, req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function recordTTI(req, res, next) {
  try {
    const unit = await service.recordTTI(req.params.bankId, req.params.id, req.body);
    sendSuccess(res, unit);
  } catch (err) { next(err); }
}

async function separateBlood(req, res, next) {
  try {
    const prbc = await service.separateBlood(req.params.bankId, req.params.id);
    sendSuccess(res, prbc);
  } catch (err) { next(err); }
}

async function listPRBC(req, res, next) {
  try {
    const result = await service.listPRBC(req.params.bankId, req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function prbcSummary(req, res, next) {
  try {
    const summary = await service.prbcSummary(req.params.bankId);
    sendSuccess(res, summary);
  } catch (err) { next(err); }
}

module.exports = { listWholeBlood, recordTTI, separateBlood, listPRBC, prbcSummary };
