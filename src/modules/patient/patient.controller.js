const service = require('./patient.service');
const { sendSuccess } = require('../../utils/responseFormatter');

async function listPatients(req, res, next) {
  try {
    const result = await service.listPatients(req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getPatient(req, res, next) {
  try {
    const patient = await service.getPatient(req.params.id);
    sendSuccess(res, patient);
  } catch (err) { next(err); }
}

async function confirmRegistration(req, res, next) {
  try {
    const patient = await service.confirmRegistration(req.params.id, req.body);
    sendSuccess(res, patient);
  } catch (err) { next(err); }
}

async function getRecommendation(req, res, next) {
  try {
    const nodes = await service.getRecommendation(req.params.id);
    sendSuccess(res, nodes);
  } catch (err) { next(err); }
}

async function fulfilPatient(req, res, next) {
  try {
    const patient = await service.fulfilPatient(req.params.id, req.user.id);
    sendSuccess(res, patient);
  } catch (err) { next(err); }
}

module.exports = { listPatients, getPatient, confirmRegistration, getRecommendation, fulfilPatient };
