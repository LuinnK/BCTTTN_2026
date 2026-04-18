const express = require('express');
const router = express.Router();
const OutboundController = require('../controllers/OutboundController');
const authenticateUser = require('../middlewares/authMiddleware');
const { requireRoles } = require('../middlewares/roleMiddleware');

// Gợi ý vị trí nhặt hàng (FEFO)
router.get('/suggest/:sku', authenticateUser, OutboundController.getPickingSuggestion);

// Yêu cầu xuất kho (nhân viên → chờ duyệt)
router.post('/request', authenticateUser, OutboundController.createOutboundRequest);
router.get('/my-requests', authenticateUser, OutboundController.listMyOutboundRequests);

// Duyệt / từ chối (Admin, Quản lý)
router.get('/requests', authenticateUser, requireRoles('ADMIN', 'MANAGER'), OutboundController.listOutboundRequests);
router.post('/requests/:id/approve', authenticateUser, requireRoles('ADMIN', 'MANAGER'), OutboundController.approveOutboundRequest);
router.post('/requests/:id/reject', authenticateUser, requireRoles('ADMIN', 'MANAGER'), OutboundController.rejectOutboundRequest);

// Xác nhận trừ tồn (nhân viên: cần yêu cầu đã duyệt; Admin/Quản lý: xuất trực tiếp)
router.post('/confirm', authenticateUser, OutboundController.processOutbound);

module.exports = router;