const service = require('./report.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function donationsReport(req, res, next) {
  try {
    const bloodBankId = req.query.bloodBankId || req.user.bloodBankId;
    const emailToAdmin = req.query.email === 'true';
    const adminUser = emailToAdmin ? req.user : null;

    const result = await service.donationsReport({ ...req.query, bloodBankId }, adminUser);

    if (emailToAdmin) {
      return sendSuccess(res, result);
    }

    if (req.query.format === 'pdf') {
      const date = req.query.date || req.query.from || new Date().toISOString().slice(0, 10);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename=donations-${date}.pdf`);
      return res.send(result);
    }

    sendSuccess(res, result);
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
