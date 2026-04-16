const express = require('express');
const router = express.Router();
const OutboundController = require('../controllers/OutboundController');
const authenticateUser = require('../middlewares/authMiddleware');

// Route lấy gợi ý vị trí nhặt hàng (FEFO)
router.get('/suggest/:sku', authenticateUser, OutboundController.getPickingSuggestion);

// Route thực thi lệnh xuất kho
router.post('/confirm', authenticateUser, OutboundController.processOutbound);

module.exports = router;