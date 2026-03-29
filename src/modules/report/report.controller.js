const service = require('./report.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function donationsReport(req, res, next) {
  try {
    const data = await service.donationsReport({ ...req.query, bloodBankId: req.query.bloodBankId || req.user.bloodBankId });
    if (req.query.format === 'pdf') {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename=donations-report.pdf`);
      return res.send(data);
    }
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function receivablesReport(req, res, next) {
  try {
    const data = await service.receivablesReport(req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function deliverablesReport(req, res, next) {
  try {
    const data = await service.deliverablesReport(req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function physicalTransferReport(req, res, next) {
  try {
    const data = await service.physicalTransferReport(req.user.bloodBankId, req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function digitalTransferReport(req, res, next) {
  try {
    const data = await service.digitalTransferReport(req.user.bloodBankId, req.query);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

module.exports = { donationsReport, receivablesReport, deliverablesReport, physicalTransferReport, digitalTransferReport };
