const { pool } = require('../config/database');

const reviewModel = {
    async findByProductId(sanPhamId) {
        const [rows] = await pool.query(
            `SELECT dg.DanhGiaId, dg.SanPhamId, dg.NguoiDungId, dg.SoSao, dg.NhanXet, dg.TrangThai, dg.NgayTao,
                    nd.HoTen,
                    EXISTS(
                        SELECT 1
                        FROM DON_HANG dh
                        JOIN CHI_TIET_DON_HANG ct ON dh.DonHangId = ct.DonHangId
                        JOIN BIEN_THE bt ON ct.BienTheId = bt.BienTheId
                        WHERE dh.NguoiDungId = dg.NguoiDungId
                          AND bt.SanPhamId = dg.SanPhamId
                          AND dh.TrangThai = 'HOAN_THANH'
                    ) AS DaMuaHang
             FROM DANH_GIA dg
             JOIN NGUOI_DUNG nd ON dg.NguoiDungId = nd.NguoiDungId
             WHERE dg.SanPhamId = ? AND dg.TrangThai = 'HIEN'
             ORDER BY dg.NgayTao DESC, dg.DanhGiaId DESC`,
            [sanPhamId]
        );
        return rows;
    },

    async hasPurchasedProduct(nguoiDungId, sanPhamId) {
        const [rows] = await pool.query(
            `SELECT 1
             FROM DON_HANG dh
             JOIN CHI_TIET_DON_HANG ct ON dh.DonHangId = ct.DonHangId
             JOIN BIEN_THE bt ON ct.BienTheId = bt.BienTheId
             WHERE dh.NguoiDungId = ?
               AND bt.SanPhamId = ?
               AND dh.TrangThai = 'HOAN_THANH'
             LIMIT 1`,
            [nguoiDungId, sanPhamId]
        );
        return rows.length > 0;
    },

    async findAll({ trangThai, sanPhamId }) {
        const conditions = [];
        const params = [];

        if (trangThai && trangThai !== 'ALL') {
            conditions.push('dg.TrangThai = ?');
            params.push(trangThai);
        }

        if (sanPhamId) {
            conditions.push('dg.SanPhamId = ?');
            params.push(Number(sanPhamId));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.query(
            `SELECT dg.DanhGiaId, dg.SanPhamId, dg.NguoiDungId, dg.SoSao, dg.NhanXet, dg.TrangThai, dg.NgayTao,
                    nd.HoTen, nd.Email, sp.TenSanPham
             FROM DANH_GIA dg
             JOIN NGUOI_DUNG nd ON dg.NguoiDungId = nd.NguoiDungId
             JOIN SAN_PHAM sp ON dg.SanPhamId = sp.SanPhamId
             ${whereClause}
             ORDER BY dg.NgayTao DESC, dg.DanhGiaId DESC`,
            params
        );
        return rows;
    },

    async findById(danhGiaId) {
        const [rows] = await pool.query(
            `SELECT dg.*, nd.HoTen, sp.TenSanPham
             FROM DANH_GIA dg
             JOIN NGUOI_DUNG nd ON dg.NguoiDungId = nd.NguoiDungId
             JOIN SAN_PHAM sp ON dg.SanPhamId = sp.SanPhamId
             WHERE dg.DanhGiaId = ?
             LIMIT 1`,
            [danhGiaId]
        );
        return rows[0] || null;
    },

    async findByUserAndProduct(nguoiDungId, sanPhamId) {
        const [rows] = await pool.query(
            'SELECT * FROM DANH_GIA WHERE NguoiDungId = ? AND SanPhamId = ? LIMIT 1',
            [nguoiDungId, sanPhamId]
        );
        return rows[0] || null;
    },

    async create({ sanPhamId, nguoiDungId, soSao, nhanXet = null }) {
        const [result] = await pool.query(
            `INSERT INTO DANH_GIA (SanPhamId, NguoiDungId, SoSao, NhanXet)
             VALUES (?, ?, ?, ?)`,
            [sanPhamId, nguoiDungId, soSao, nhanXet]
        );
        return result.insertId;
    },

    async updateStatus(danhGiaId, trangThai) {
        const [result] = await pool.query(
            'UPDATE DANH_GIA SET TrangThai = ? WHERE DanhGiaId = ?',
            [trangThai, danhGiaId]
        );
        return result.affectedRows > 0;
    },

    async delete(danhGiaId) {
        const [result] = await pool.query(
            'DELETE FROM DANH_GIA WHERE DanhGiaId = ?',
            [danhGiaId]
        );
        return result.affectedRows > 0;
    }
};

module.exports = reviewModel;