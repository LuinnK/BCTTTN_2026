// src/utils/apiResponse.js

// Chuẩn hóa định dạng JSON trả về cho toàn bộ hệ thống
const successResponse = (res, statusCode = 200, message = 'Thành công', data = {}) => {
    return res.status(statusCode).json({
        status: 'success',
        message: message,
        data: data
    });
};

const errorResponse = (res, statusCode = 500, message = 'Đã xảy ra lỗi máy chủ') => {
    return res.status(statusCode).json({
        status: 'error',
        message: message
    });
};

module.exports = { successResponse, errorResponse };