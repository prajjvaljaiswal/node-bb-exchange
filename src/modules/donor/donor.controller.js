const service = require('./donor.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function listDonors(req, res, next) {
  try {
    const result = await service.listDonors(req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getDonor(req, res, next) {
  try {
    const donor = await service.getDonor(req.params.id);
    sendSuccess(res, donor);
  } catch (err) { next(err); }
}

async function getDonorCards(req, res, next) {
  try {
    const cards = await service.getDonorCards(req.params.id);
    sendSuccess(res, cards);
  } catch (err) { next(err); }
}

async function getEligiblePatients(req, res, next) {
  try {
    const patients = await service.getEligiblePatients(req.params.id);
    sendSuccess(res, patients);
  } catch (err) { next(err); }
}

async function selectPatient(req, res, next) {
  try {
    const result = await service.selectPatient(req.params.id, req.body.patientId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

module.exports = { listDonors, getDonor, getDonorCards, getEligiblePatients, selectPatient };
