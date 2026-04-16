const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const authenticateUser = require('../middlewares/authMiddleware');

// Route: POST /api/v1/inventory/inbound
router.post('/inbound', authenticateUser, InventoryController.handleInboundScan);

// Route: POST /api/v1/inventory/transfer
router.post('/transfer', authenticateUser, InventoryController.handleTransfer);

module.exports = router;