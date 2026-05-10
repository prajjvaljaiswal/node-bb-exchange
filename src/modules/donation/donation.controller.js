const service = require('./donation.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');

async function createDonation(req, res, next) {
  try {
    const result = await service.createDonation(req.body, req.user.bloodBankAdminId, req.user.bloodBankId);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function listDonations(req, res, next) {
  try {
    const result = await service.listDonations(req.query, req.user);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getDonation(req, res, next) {
  try {
    const donation = await service.getDonation(req.params.id);
    sendSuccess(res, donation);
  } catch (err) { next(err); }
}

module.exports = { createDonation, listDonations, getDonation };
