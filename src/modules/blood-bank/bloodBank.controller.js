const service = require('./bloodBank.service');
const { sendSuccess, sendCreated, sendError } = require('../../utils/responseFormatter');

async function listBanks(req, res, next) {
  try {
    const result = await service.listBanks(req.query);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

async function getBank(req, res, next) {
  try {
    const bank = await service.getBank(req.params.id, req.user);
    sendSuccess(res, bank);
  } catch (err) { next(err); }
}

async function approveBank(req, res, next) {
  try {
    const bank = await service.approveBank(req.params.id, req.user.id);
    sendSuccess(res, bank);
  } catch (err) { next(err); }
}

async function suspendBank(req, res, next) {
  try {
    const bank = await service.suspendBank(req.params.id);
    sendSuccess(res, bank);
  } catch (err) { next(err); }
}

async function updateBank(req, res, next) {
  try {
    const bank = await service.updateBank(req.params.id, req.body);
    sendSuccess(res, bank);
  } catch (err) { next(err); }
}

async function listAdmins(req, res, next) {
  try {
    const admins = await service.listAdmins(req.params.id);
    sendSuccess(res, admins);
  } catch (err) { next(err); }
}

async function createAdmin(req, res, next) {
  try {
    const result = await service.createAdmin(req.params.id, req.body);
    sendCreated(res, result);
  } catch (err) { next(err); }
}

async function updateAdminStatus(req, res, next) {
  try {
    const admin = await service.updateAdminStatus(req.params.id, req.params.adminId, req.body.authStatus);
    sendSuccess(res, admin);
  } catch (err) { next(err); }
}

async function deleteAdmin(req, res, next) {
  try {
    const result = await service.deleteAdmin(req.params.id, req.params.adminId, req.user.id);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

module.exports = { listBanks, getBank, approveBank, suspendBank, updateBank, listAdmins, createAdmin, updateAdminStatus, deleteAdmin };
