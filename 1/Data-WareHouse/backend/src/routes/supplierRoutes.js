const express = require('express');
const router = express.Router();
const SupplierController = require('../controllers/SupplierController');
const authenticateUser = require('../middlewares/authMiddleware');

router.get('/', authenticateUser, SupplierController.list);
router.post('/', authenticateUser, SupplierController.add);

module.exports = router;