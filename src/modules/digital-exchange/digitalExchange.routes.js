const express = require('express');
const router = express.Router();
const controller = require('./digitalExchange.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./digitalExchange.schema');
const { ROLES } = require('../../config/constants');

const BA = authorize(ROLES.BLOOD_BANK_ADMIN);

router.post('/bilateral/propose', authenticate, BA, validate(schema.bilateralPropose), controller.proposeBilateral);
router.post('/bilateral/execute/:proposalId', authenticate, BA, controller.executeBilateral);
router.post('/unilateral/propose', authenticate, BA, validate(schema.unilateralPropose), controller.proposeUnilateral);
router.post('/unilateral/consent/:proposalId', authenticate, BA, controller.consentUnilateral);
router.post('/unilateral/execute/:proposalId', authenticate, BA, controller.executeUnilateral);
router.get('/history/:bankId', authenticate, controller.history);

module.exports = router;
