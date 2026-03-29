const service = require('./balanceSheet.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function receivables(req, res, next) {
  try {
    const data = await service.getReceivables(req.params.bankId, req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function deliverables(req, res, next) {
  try {
    const data = await service.getDeliverables(req.params.bankId, req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function summary(req, res, next) {
  try {
    const data = await service.getSummary(req.params.bankId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function neighbours(req, res, next) {
  try {
    const data = await service.getNeighbours(req.params.bankId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

module.exports = { receivables, deliverables, summary, neighbours };
