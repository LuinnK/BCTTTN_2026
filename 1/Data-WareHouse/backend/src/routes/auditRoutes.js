const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/AuditController');
const authenticateUser = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// STAFF quét mã kiểm kê
router.get('/bin/:binCode', authenticateUser, AuditController.getBinInventory);

// CHỈ MANAGER VÀ ADMIN MỚI ĐƯỢC PHÊ DUYỆT CÂN ĐỐI KHO
router.post('/adjust', authenticateUser, authorizeRoles('MANAGER', 'ADMIN'), AuditController.processInventoryAdjustment);

module.exports = router;