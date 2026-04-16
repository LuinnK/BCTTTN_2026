// src/middlewares/roleMiddleware.js

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // 1. Kiểm tra xem thông tin user đã tồn tại chưa (do authMiddleware gán vào)
        if (!req.user ||!req.user.role) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Không tìm thấy thông tin quyền hạn người dùng!' 
            });
        }

        // 2. Đối chiếu vai trò của user với danh sách vai trò được phép
        //allowedRoles sẽ là mảng như
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: `Quyền truy cập bị từ chối! Chức năng này yêu cầu quyền:`
            });
        }

        // 3. Nếu hợp lệ, cho phép đi tiếp vào Controller
        next();
    };
};

module.exports = authorizeRoles;