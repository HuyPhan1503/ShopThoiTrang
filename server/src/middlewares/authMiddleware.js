const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Bạn chưa đăng nhập hoặc thiếu token xác thực.', 401));
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return next(new AppError('Phiên đăng nhập đã hết hạn hoặc token không hợp lệ.', 401));
    }
};

// Dùng cho các chức năng hỗ trợ cả khách vãng lai lẫn thành viên (ví dụ: Đặt hàng)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            req.user = null;
        }
    }
    next();
};

module.exports = {
    verifyToken,
    optionalAuth
};