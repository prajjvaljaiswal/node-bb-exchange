const service = require('./bloodBankGroup.service');
const { sendSuccess, sendCreated } = require('../../utils/responseFormatter');

async function createGroup(req, res, next) {
  try {
    const group = await service.createGroup(req.body, req.user.id);
    sendCreated(res, group);
  } catch (err) { next(err); }
}

async function listGroups(req, res, next) {
  try {
    const result = await service.listGroups(req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getGroup(req, res, next) {
  try {
    const group = await service.getGroup(req.params.id);
    sendSuccess(res, group);
  } catch (err) { next(err); }
}

async function addMember(req, res, next) {
  try {
    const member = await service.addMember(req.params.id, req.body.bloodBankId);
    sendCreated(res, member);
  } catch (err) { next(err); }
}

async function approveMember(req, res, next) {
  try {
    const member = await service.approveMember(req.params.id, req.params.memberId);
    sendSuccess(res, member);
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    const result = await service.removeMember(req.params.id, req.params.memberId);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function getGroupBalanceSheets(req, res, next) {
  try {
    const data = await service.getGroupBalanceSheets(req.params.id, req.user.bloodBankId);
    sendSuccess(res, data);
  } catch (err) { next(err); }
}

async function citySearch(req, res, next) {
  try {
    const { bloodGroup, state } = req.query;
    const result = await service.citySearch(req.params.id, bloodGroup, state);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

module.exports = { createGroup, listGroups, getGroup, addMember, approveMember, removeMember, getGroupBalanceSheets, citySearch };
