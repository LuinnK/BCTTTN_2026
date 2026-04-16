const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const authenticateUser = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Chỉ MANAGER và ADMIN được xem dự báo và báo cáo tổng quát
router.get('/forecast/:sku', authenticateUser, authorizeRoles('MANAGER', 'ADMIN'), AnalyticsController.runDemandForecast);
router.get('/summary', authenticateUser, authorizeRoles('MANAGER', 'ADMIN'), AnalyticsController.getDashboardSummary);
router.get('/low-stock', authenticateUser, authorizeRoles('MANAGER', 'ADMIN'), AnalyticsController.getLowStockList);

module.exports = router;