const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

router.post('/register/blood-bank', controller.registerBloodBank);
router.post('/register/donor', controller.registerDonor);
router.post('/register/patient', controller.registerPatient);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticate, controller.logout);
router.post('/verify-email', controller.verifyEmail);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);
router.get('/me', authenticate, controller.me);

module.exports = router;
