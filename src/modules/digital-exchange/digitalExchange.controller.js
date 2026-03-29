const service = require('./digitalExchange.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');

async function proposeBilateral(req, res, next) {
  try {
    const proposal = await service.proposeBilateral(req.body, req.user.bloodBankId);
    sendCreated(res, proposal);
  } catch (err) { next(err); }
}

async function executeBilateral(req, res, next) {
  try {
    const result = await service.executeBilateral(req.params.proposalId, req.user.bloodBankId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function proposeUnilateral(req, res, next) {
  try {
    const proposal = await service.proposeUnilateral(req.body, req.user.bloodBankId);
    sendCreated(res, proposal);
  } catch (err) { next(err); }
}

async function consentUnilateral(req, res, next) {
  try {
    const result = await service.consentUnilateral(req.params.proposalId, req.user.bloodBankId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function executeUnilateral(req, res, next) {
  try {
    const result = await service.executeUnilateral(req.params.proposalId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function history(req, res, next) {
  try {
    const data = await service.history(req.params.bankId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

module.exports = { proposeBilateral, executeBilateral, proposeUnilateral, consentUnilateral, executeUnilateral, history };
