const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const authenticateUser = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware'); // Import mới

// STAFF, MANAGER, ADMIN đều quét được mã
router.get('/barcode/:barcode', authenticateUser, ProductController.getProductByBarcode);

// Chỉ ADMIN và MANAGER mới được Thêm/Sửa
router.post('/', authenticateUser, authorizeRoles('ADMIN', 'MANAGER'), ProductController.create);
router.put('/:id', authenticateUser, authorizeRoles('ADMIN', 'MANAGER'), ProductController.update);

// CHỈ ADMIN MỚI ĐƯỢC XÓA
router.delete('/:id', authenticateUser, authorizeRoles('ADMIN'), ProductController.delete);

module.exports = router;