const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const authController = {
    register: asyncHandler(async (req, res) => {
        const data = await authService.register(req.body);
        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công.',
            data
        });
    }),

    login: asyncHandler(async (req, res) => {
        const data = await authService.login(req.body);
        res.json({
            success: true,
            message: 'Đăng nhập thành công.',
            data
        });
    }),

    getMe: asyncHandler(async (req, res) => {
        const user = await authService.getProfile(req.user.id);
        res.json({
            success: true,
            data: user
        });
    })
};

module.exports = authController;