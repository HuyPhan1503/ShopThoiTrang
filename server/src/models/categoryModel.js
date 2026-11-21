const { pool } = require('../config/database');

const categoryModel = {
    async findAll() {
        const [rows] = await pool.query(`
            SELECT d.DanhMucId, d.TenDanhMuc, d.MoTa, COUNT(s.SanPhamId) AS SoSanPham
            FROM DANH_MUC d
            LEFT JOIN SAN_PHAM s ON s.DanhMucId = d.DanhMucId
            GROUP BY d.DanhMucId, d.TenDanhMuc, d.MoTa
            ORDER BY d.DanhMucId ASC
        `);
        return rows;
    },

    async findById(id) {
        const [rows] = await pool.query(
            'SELECT DanhMucId, TenDanhMuc, MoTa FROM DANH_MUC WHERE DanhMucId = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    async findByName(tenDanhMuc) {
        const [rows] = await pool.query(
            'SELECT DanhMucId, TenDanhMuc, MoTa FROM DANH_MUC WHERE TenDanhMuc = ? LIMIT 1',
            [tenDanhMuc]
        );
        return rows[0] || null;
    },

    async create({ tenDanhMuc, moTa = null }) {
        const [result] = await pool.query(
            'INSERT INTO DANH_MUC (TenDanhMuc, MoTa) VALUES (?, ?)',
            [tenDanhMuc, moTa]
        );
        return result.insertId;
    },

    async update(id, { tenDanhMuc, moTa = null }) {
        const [result] = await pool.query(
            'UPDATE DANH_MUC SET TenDanhMuc = ?, MoTa = ? WHERE DanhMucId = ?',
            [tenDanhMuc, moTa, id]
        );
        return result.affectedRows > 0;
    },

    async countProducts(id) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM SAN_PHAM WHERE DanhMucId = ?',
            [id]
        );
        return rows[0].total;
    },

    async delete(id) {
        const [result] = await pool.query(
            'DELETE FROM DANH_MUC WHERE DanhMucId = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = categoryModel;