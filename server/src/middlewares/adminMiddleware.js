const AppError = require('../utils/AppError');

const isAdmin = (req, res, next) => {
    if (!req.user || req.user.vaiTro !== 'ADMIN') {
        return next(new AppError('Bạn không có quyền quản trị để thực hiện thao tác này.', 403));
    }
    next();
};

module.exports = isAdmin;