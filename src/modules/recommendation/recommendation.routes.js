const express = require('express');
const router = express.Router();
const controller = require('./recommendation.controller');
const { authenticate } = require('../../middleware/auth');

router.get('/patients/:patientId', authenticate, controller.getRecommendations);
router.get('/blood-banks/:bankId/cycle-history', authenticate, controller.cycleHistory);

module.exports = router;
