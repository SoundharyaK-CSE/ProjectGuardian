const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/stats', dashboardController.getStats);
router.get('/analyses', dashboardController.getRecentAnalyses);
router.get('/projects', dashboardController.getRecentProjects);

module.exports = router;
