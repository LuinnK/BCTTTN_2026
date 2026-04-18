// src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. IMPORT CÁC ĐỊNH TUYẾN (Chỉ khai báo 1 lần duy nhất ở đây)
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const outboundRoutes = require('./routes/outboundRoutes');
const auditRoutes = require('./routes/auditRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Import Middleware bẫy lỗi
const errorHandler = require('./middlewares/errorMiddleware');

const app = express();

// 2. CẤU HÌNH MIDDLEWARES CƠ BẢN [4]
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Phục vụ giao diện Frontend (thư mục public)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 3. ĐĂNG KÝ CÁC LUỒNG API (ENDPOINTS) [1, 2]
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/outbound', outboundRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/orders', orderRoutes);

// Route kiểm tra sức khỏe hệ thống
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ 
        status: 'success', 
        message: 'Hệ thống Backend Quản trị Kho đang hoạt động mượt mà!' 
    });
});

// 4. BẪY LỖI TOÀN CỤC (PHẢI NẰM CUỐI CÙNG TRƯỚC EXPORTS) 
app.use(errorHandler);

// 5. XUẤT APP (Luôn nằm ở dòng cuối cùng của file)
module.exports = app;