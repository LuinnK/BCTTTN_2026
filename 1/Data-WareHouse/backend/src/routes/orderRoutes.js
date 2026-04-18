const express = require('express');
const router = express.Router();

// Import controller, đảm bảo đường dẫn chính xác và không dùng {}
const OrderController = require('../controllers/OrderController');

// Giả sử bạn có middleware để xác thực người dùng
// const { protect } = require('../middlewares/authMiddleware');
// router.use(protect);

// GET /api/v1/orders - Lấy danh sách tất cả đơn hàng
router.get('/', OrderController.listOrders);

// POST /api/v1/orders - Tạo đơn hàng mới
router.post('/', OrderController.createOrder);

// GET /api/v1/orders/:id - Lấy chi tiết một đơn hàng
router.get('/:id', OrderController.getOrderDetails);

// POST /api/v1/orders/:id/allocate - Xử lý phân bổ hàng cho đơn hàng
router.post('/:id/allocate', OrderController.allocateOrder);

module.exports = router;