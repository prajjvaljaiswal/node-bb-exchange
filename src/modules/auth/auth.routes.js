const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const schema = require('./auth.schema');

router.post('/register/blood-bank', validate(schema.registerBloodBank), controller.registerBloodBank);
router.post('/register/donor', validate(schema.registerDonor), controller.registerDonor);
router.post('/register/patient', validate(schema.registerPatient), controller.registerPatient);
router.post('/login', validate(schema.login), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.post('/verify-email', validate(schema.verifyEmail), controller.verifyEmail);
router.post('/forgot-password', validate(schema.forgotPassword), controller.forgotPassword);
router.post('/reset-password', validate(schema.resetPassword), controller.resetPassword);
router.get('/me', authenticate, controller.me);

module.exports = router;
