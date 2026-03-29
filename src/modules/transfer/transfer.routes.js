const express = require('express');
const router = express.Router();
const controller = require('./transfer.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./transfer.schema');
const { ROLES } = require('../../config/constants');

const BA = authorize(ROLES.BLOOD_BANK_ADMIN);

// Form A
router.post('/form-a', authenticate, BA, validate(schema.createFormA), controller.createFormA);
router.get('/form-a', authenticate, controller.listFormA);
router.get('/form-a/:id', authenticate, controller.getFormA);
router.patch('/form-a/:id/respond', authenticate, BA, validate(schema.respondFormA), controller.respondFormA);

// Form B
router.post('/form-b', authenticate, BA, validate(schema.createFormB), controller.createFormB);
router.get('/form-b', authenticate, controller.listFormB);
router.get('/form-b/:id', authenticate, controller.getFormB);
router.patch('/form-b/:id/receive', authenticate, BA, validate(schema.receiveFormB), controller.receiveFormB);
router.patch('/form-b/:id/report-discrepancy', authenticate, BA, controller.reportDiscrepancy);

module.exports = router;
