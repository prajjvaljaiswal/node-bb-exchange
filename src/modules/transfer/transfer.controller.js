const service = require('./transfer.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');

async function createFormA(req, res, next) {
  try {
    const formA = await service.createFormA(req.body, req.user.id, req.user.bloodBankId);
    sendCreated(res, formA);
  } catch (err) { next(err); }
}

async function listFormA(req, res, next) {
  try {
    const result = await service.listFormA(req.query, req.user);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getFormA(req, res, next) {
  try {
    const formA = await service.getFormA(req.params.id);
    sendSuccess(res, formA);
  } catch (err) { next(err); }
}

async function respondFormA(req, res, next) {
  try {
    const formA = await service.respondFormA(req.params.id, req.body, req.user.id);
    sendSuccess(res, formA);
  } catch (err) { next(err); }
}

async function createFormB(req, res, next) {
  try {
    const result = await service.createFormB(req.body, req.user.id);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function listFormB(req, res, next) {
  try {
    const result = await service.listFormB(req.query, req.user);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getFormB(req, res, next) {
  try {
    const formB = await service.getFormB(req.params.id);
    sendSuccess(res, formB);
  } catch (err) { next(err); }
}

async function receiveFormB(req, res, next) {
  try {
    const formB = await service.receiveFormB(req.params.id, req.body, req.user.id);
    sendSuccess(res, formB);
  } catch (err) { next(err); }
}

async function reportDiscrepancy(req, res, next) {
  try {
    const formB = await service.reportDiscrepancy(req.params.id, req.body.notes);
    sendSuccess(res, formB);
  } catch (err) { next(err); }
}

module.exports = { createFormA, listFormA, getFormA, respondFormA, createFormB, listFormB, getFormB, receiveFormB, reportDiscrepancy };
