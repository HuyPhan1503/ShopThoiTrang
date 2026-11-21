const { pool } = require('../config/database');

const variantModel = {
    async findByProductId(sanPhamId) {
        const [rows] = await pool.query(
            `SELECT BienTheId, SanPhamId, Size, Mau, Sku, SoLuongTon
             FROM BIEN_THE
             WHERE SanPhamId = ?
             ORDER BY BienTheId ASC`,
            [sanPhamId]
        );
        return rows;
    },

    async findById(bienTheId) {
        const [rows] = await pool.query(
            'SELECT * FROM BIEN_THE WHERE BienTheId = ? LIMIT 1',
            [bienTheId]
        );
        return rows[0] || null;
    },

    async findBySku(sku) {
        const [rows] = await pool.query(
            'SELECT * FROM BIEN_THE WHERE Sku = ? LIMIT 1',
            [sku]
        );
        return rows[0] || null;
    },

    async findByProductSizeColor(sanPhamId, size, mau) {
        const [rows] = await pool.query(
            'SELECT * FROM BIEN_THE WHERE SanPhamId = ? AND Size = ? AND Mau = ? LIMIT 1',
            [sanPhamId, size, mau]
        );
        return rows[0] || null;
    },

    async create({ sanPhamId, size, mau, sku, soLuongTon = 0 }, conn = pool) {
        const [result] = await conn.query(
            `INSERT INTO BIEN_THE (SanPhamId, Size, Mau, Sku, SoLuongTon)
             VALUES (?, ?, ?, ?, ?)`,
            [sanPhamId, size, mau, sku, soLuongTon]
        );
        return result.insertId;
    },

    async update(bienTheId, { size, mau, sku, soLuongTon }) {
        const [result] = await pool.query(
            `UPDATE BIEN_THE
             SET Size = ?, Mau = ?, Sku = ?, SoLuongTon = ?
             WHERE BienTheId = ?`,
            [size, mau, sku, soLuongTon, bienTheId]
        );
        return result.affectedRows > 0;
    },

    async countOrders(bienTheId) {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM CHI_TIET_DON_HANG WHERE BienTheId = ?',
            [bienTheId]
        );
        return rows[0].total;
    },

    async delete(bienTheId) {
        const [result] = await pool.query('DELETE FROM BIEN_THE WHERE BienTheId = ?', [bienTheId]);
        return result.affectedRows > 0;
    }
};

module.exports = variantModel;