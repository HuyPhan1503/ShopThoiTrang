const { pool } = require('../config/database');

const productModel = {
    async findAll({ danhMucId, keyword, trangThai, minGia, maxGia, sort = 'moi_nhat', limit = 12, offset = 0 }) {
        const conditions = [];
        const params = [];

        if (trangThai && trangThai !== 'ALL') {
            conditions.push('v.TrangThai = ?');
            params.push(trangThai);
        }

        if (danhMucId) {
            conditions.push('v.DanhMucId = ?');
            params.push(Number(danhMucId));
        }

        if (keyword) {
            conditions.push('(v.TenSanPham LIKE ? OR v.MoTa LIKE ?)');
            const likeKeyword = `%${keyword}%`;
            params.push(likeKeyword, likeKeyword);
        }

        if (minGia !== undefined && minGia !== '') {
            conditions.push('v.Gia >= ?');
            params.push(Number(minGia));
        }

        if (maxGia !== undefined && maxGia !== '') {
            conditions.push('v.Gia <= ?');
            params.push(Number(maxGia));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        let orderBy = 'v.NgayTao DESC, v.SanPhamId DESC';
        if (sort === 'gia_asc') orderBy = 'v.Gia ASC, v.SanPhamId DESC';
        else if (sort === 'gia_desc') orderBy = 'v.Gia DESC, v.SanPhamId DESC';
        else if (sort === 'cu_nhat') orderBy = 'v.NgayTao ASC, v.SanPhamId ASC';

        const countSql = `SELECT COUNT(*) AS total FROM v_SanPham_TongQuan v ${whereClause}`;
        const [countRows] = await pool.query(countSql, params);
        const total = countRows[0].total;

        const dataSql = `
            SELECT v.*,
                   COALESCE(dg.DiemDanhGia, 0) AS DiemDanhGia,
                   COALESCE(dg.SoDanhGia, 0) AS SoDanhGia
            FROM v_SanPham_TongQuan v
            LEFT JOIN (
                SELECT SanPhamId, ROUND(AVG(SoSao), 1) AS DiemDanhGia, COUNT(*) AS SoDanhGia
                FROM DANH_GIA
                WHERE TrangThai = 'HIEN'
                GROUP BY SanPhamId
            ) dg ON dg.SanPhamId = v.SanPhamId
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query(dataSql, [...params, Number(limit), Number(offset)]);

        return { items: rows, total };
    },

    async findById(id) {
        const [rows] = await pool.query(
            `SELECT v.*,
                    COALESCE(dg.DiemDanhGia, 0) AS DiemDanhGia,
                    COALESCE(dg.SoDanhGia, 0) AS SoDanhGia
             FROM v_SanPham_TongQuan v
             LEFT JOIN (
                 SELECT SanPhamId, ROUND(AVG(SoSao), 1) AS DiemDanhGia, COUNT(*) AS SoDanhGia
                 FROM DANH_GIA
                 WHERE TrangThai = 'HIEN'
                 GROUP BY SanPhamId
             ) dg ON dg.SanPhamId = v.SanPhamId
             WHERE v.SanPhamId = ?
             LIMIT 1`,
            [id]
        );
        return rows[0] || null;
    },

    async create({ danhMucId, tenSanPham, moTa = null, gia, anhUrl = null, trangThai = 'DANG_BAN' }, conn = pool) {
        const [result] = await conn.query(
            `INSERT INTO SAN_PHAM (DanhMucId, TenSanPham, MoTa, Gia, AnhUrl, TrangThai)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [danhMucId, tenSanPham, moTa, gia, anhUrl, trangThai]
        );
        return result.insertId;
    },

    async update(id, { danhMucId, tenSanPham, moTa, gia, anhUrl, trangThai }) {
        const [result] = await pool.query(
            `UPDATE SAN_PHAM
             SET DanhMucId = ?, TenSanPham = ?, MoTa = ?, Gia = ?, AnhUrl = ?, TrangThai = ?
             WHERE SanPhamId = ?`,
            [danhMucId, tenSanPham, moTa, gia, anhUrl, trangThai, id]
        );
        return result.affectedRows > 0;
    },

    async countOrders(id) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total
             FROM CHI_TIET_DON_HANG c
             JOIN BIEN_THE b ON c.BienTheId = b.BienTheId
             WHERE b.SanPhamId = ?`,
            [id]
        );
        return rows[0].total;
    },

    async delete(id) {
        const [result] = await pool.query('DELETE FROM SAN_PHAM WHERE SanPhamId = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = productModel;