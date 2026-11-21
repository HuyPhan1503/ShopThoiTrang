const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword, comparePassword } = require('../utils/hashPassword');

const userController = {
    // Khách hàng tự cập nhật thông tin cá nhân
    updateProfile: asyncHandler(async (req, res) => {
        const { hoTen, soDienThoai } = req.body;
        if (!hoTen || !soDienThoai) {
            throw new AppError('Vui lòng nhập đầy đủ họ tên và số điện thoại.', 400);
        }

        await userModel.updateProfile(req.user.id, {
            hoTen: hoTen.trim(),
            soDienThoai: soDienThoai.trim()
        });

        const updatedUser = await userModel.findById(req.user.id);
        res.json({
            success: true,
            message: 'Cập nhật thông tin cá nhân thành công.',
            data: updatedUser
        });
    }),

    // Khách hàng đổi mật khẩu
    changePassword: asyncHandler(async (req, res) => {
        const { matKhauCu, matKhauMoi } = req.body;
        if (!matKhauCu || !matKhauMoi) {
            throw new AppError('Vui lòng nhập mật khẩu cũ và mật khẩu mới.', 400);
        }
        if (matKhauMoi.length < 6) {
            throw new AppError('Mật khẩu mới phải có ít nhất 6 ký tự.', 400);
        }

        const user = await userModel.findByIdWithPassword(req.user.id);
        if (!user) {
            throw new AppError('Không tìm thấy tài khoản.', 404);
        }

        const isMatch = await comparePassword(matKhauCu, user.MatKhauHash);
        if (!isMatch) {
            throw new AppError('Mật khẩu cũ không chính xác.', 401);
        }

        const newHash = await hashPassword(matKhauMoi);
        await userModel.updatePassword(req.user.id, newHash);

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công.'
        });
    }),

    // Admin lấy danh sách toàn bộ người dùng
    getAllUsers: asyncHandler(async (req, res) => {
        const users = await userModel.findAll();
        res.json({
            success: true,
            data: users
        });
    }),

    // Admin cập nhật vai trò người dùng
    updateUserRole: asyncHandler(async (req, res) => {
        const targetId = Number(req.params.id);
        const { vaiTro } = req.body;

        if (!['CUSTOMER', 'ADMIN'].includes(vaiTro)) {
            throw new AppError('Vai trò không hợp lệ (chỉ chấp nhận CUSTOMER hoặc ADMIN).', 400);
        }

        if (targetId === req.user.id) {
            throw new AppError('Bạn không thể tự thay đổi vai trò của chính mình.', 400);
        }

        const user = await userModel.findById(targetId);
        if (!user) {
            throw new AppError('Không tìm thấy người dùng.', 404);
        }

        await userModel.updateRole(targetId, vaiTro);
        const updated = await userModel.findById(targetId);

        res.json({
            success: true,
            message: 'Cập nhật vai trò người dùng thành công.',
            data: updated
        });
    })
};

module.exports = userController;