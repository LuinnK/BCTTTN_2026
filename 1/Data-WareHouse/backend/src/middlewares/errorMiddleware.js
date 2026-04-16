const errorHandler = (err, req, res, next) => {
    console.error(`: ${err.message}`);

    // Mặc định là lỗi 500 (Internal Server Error) nếu không chỉ định
    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Đã xảy ra lỗi máy chủ!',
        // Chỉ in ra stack trace (chi tiết lỗi) khi đang ở môi trường dev
        stack: process.env.NODE_ENV === 'development'? err.stack : undefined
    });
};

module.exports = errorHandler;