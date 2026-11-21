const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const generateToken = require('../utils/generateToken');
const { hashPassword, comparePassword } = require('../utils/hashPassword');

const authService = {
    async register({ hoTen, email, soDienThoai, matKhau }) {
        if (!hoTen || !email || !soDienThoai || !matKhau) {
            throw new AppError('Vui lòng nhập đầy đủ họ tên, email, số điện thoại và mật khẩu.', 400);
        }

        if (matKhau.length < 6) {
            throw new AppError('Mật khẩu phải có ít nhất 6 ký tự.', 400);
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await userModel.findByEmail(normalizedEmail);
        if (existingUser) {
            throw new AppError('Email này đã được sử dụng.', 409);
        }

        const matKhauHash = await hashPassword(matKhau);
        const newUserId = await userModel.create({
            hoTen: hoTen.trim(),
            email: normalizedEmail,
            soDienThoai: soDienThoai.trim(),
            matKhauHash,
            vaiTro: 'CUSTOMER'
        });

        const newUser = await userModel.findById(newUserId);
        const token = generateToken(newUser);

        return { token, user: newUser };
    },

    async login({ email, matKhau }) {
        if (!email || !matKhau) {
            throw new AppError('Vui lòng nhập email và mật khẩu.', 400);
        }

        const user = await userModel.findByEmail(email.trim().toLowerCase());
        if (!user) {
            throw new AppError('Email hoặc mật khẩu không chính xác.', 401);
        }

        const isMatch = await comparePassword(matKhau, user.MatKhauHash);
        if (!isMatch) {
            throw new AppError('Email hoặc mật khẩu không chính xác.', 401);
        }

        const token = generateToken(user);
        const { MatKhauHash, ...userInfo } = user;

        return { token, user: userInfo };
    },

    async getProfile(nguoiDungId) {
        const user = await userModel.findById(nguoiDungId);
        if (!user) {
            throw new AppError('Không tìm thấy thông tin người dùng.', 404);
        }
        return user;
    }
};

module.exports = authService;