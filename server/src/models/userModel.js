const { pool } = require('../config/database');

const userModel = {
    async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM NGUOI_DUNG WHERE Email = ? LIMIT 1',
            [email]
        );
        return rows[0] || null;
    },

    async findById(id) {
        const [rows] = await pool.query(
            'SELECT NguoiDungId, HoTen, Email, SoDienThoai, VaiTro, NgayTao FROM NGUOI_DUNG WHERE NguoiDungId = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    async findByIdWithPassword(id) {
        const [rows] = await pool.query(
            'SELECT * FROM NGUOI_DUNG WHERE NguoiDungId = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    async create({ hoTen, email, soDienThoai, matKhauHash, vaiTro = 'CUSTOMER' }) {
        const [result] = await pool.query(
            `INSERT INTO NGUOI_DUNG (HoTen, Email, SoDienThoai, MatKhauHash, VaiTro)
             VALUES (?, ?, ?, ?, ?)`,
            [hoTen, email, soDienThoai, matKhauHash, vaiTro]
        );
        return result.insertId;
    },

    async findAll() {
        const [rows] = await pool.query(
            'SELECT NguoiDungId, HoTen, Email, SoDienThoai, VaiTro, NgayTao FROM NGUOI_DUNG ORDER BY NgayTao DESC'
        );
        return rows;
    },

    async updateProfile(id, { hoTen, soDienThoai }) {
        const [result] = await pool.query(
            'UPDATE NGUOI_DUNG SET HoTen = ?, SoDienThoai = ? WHERE NguoiDungId = ?',
            [hoTen, soDienThoai, id]
        );
        return result.affectedRows > 0;
    },

    async updatePassword(id, matKhauHash) {
        const [result] = await pool.query(
            'UPDATE NGUOI_DUNG SET MatKhauHash = ? WHERE NguoiDungId = ?',
            [matKhauHash, id]
        );
        return result.affectedRows > 0;
    },

    async updateRole(id, vaiTro) {
        const [result] = await pool.query(
            'UPDATE NGUOI_DUNG SET VaiTro = ? WHERE NguoiDungId = ?',
            [vaiTro, id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = userModel;