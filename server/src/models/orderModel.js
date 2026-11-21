const { pool } = require('../config/database');

const orderModel = {
    async createOrder(conn, {
        nguoiDungId = null,
        hoTenNhan,
        sdtNhan,
        emailNhan = null,
        diaChiNhan,
        ghiChu = null,
        tongTien,
        phuongThucThanhToan = 'COD',
        maVoucher = null,
        soTienGiam = 0
    }) {
        const [result] = await conn.query(
            `INSERT INTO DON_HANG (NguoiDungId, HoTenNhan, SdtNhan, EmailNhan, DiaChiNhan, GhiChu, TongTien, PhuongThucThanhToan, MaVoucher, SoTienGiam, HanChuanBi)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 48 HOUR))`,
            [nguoiDungId, hoTenNhan, sdtNhan, emailNhan, diaChiNhan, ghiChu, tongTien, phuongThucThanhToan, maVoucher, soTienGiam]
        );
        return result.insertId;
    },

    async createOrderItems(conn, donHangId, items) {
        for (const item of items) {
            await conn.query(
                `INSERT INTO CHI_TIET_DON_HANG (DonHangId, BienTheId, SoLuong, DonGia)
                 VALUES (?, ?, ?, ?)`,
                [donHangId, item.bienTheId, item.soLuong, item.donGia]
            );
        }
    },

    async findOrderItems(donHangId) {
        const [rows] = await pool.query(
            `SELECT c.ChiTietId, c.DonHangId, c.BienTheId, c.SoLuong, c.DonGia,
                    (c.SoLuong * c.DonGia) AS ThanhTien,
                    b.Size, b.Mau, b.Sku,
                    s.SanPhamId, s.TenSanPham, s.AnhUrl
             FROM CHI_TIET_DON_HANG c
             JOIN BIEN_THE b ON c.BienTheId = b.BienTheId
             JOIN SAN_PHAM s ON b.SanPhamId = s.SanPhamId
             WHERE c.DonHangId = ?
             ORDER BY c.ChiTietId ASC`,
            [donHangId]
        );
        return rows;
    },

    async findById(donHangId) {
        const [rows] = await pool.query(
            `SELECT d.*, u.HoTen AS TenTaiKhoan, u.Email AS EmailTaiKhoan
             FROM DON_HANG d
             LEFT JOIN NGUOI_DUNG u ON d.NguoiDungId = u.NguoiDungId
             WHERE d.DonHangId = ?
             LIMIT 1`,
            [donHangId]
        );

        if (!rows[0]) return null;
        const chiTiet = await this.findOrderItems(donHangId);
        return { ...rows[0], chiTiet };
    },

    async findByMaDonAndPhone(maDon, sdtNhan) {
        const [rows] = await pool.query(
            `SELECT *
             FROM DON_HANG
             WHERE MaDon = ? AND SdtNhan = ?
             LIMIT 1`,
            [maDon, sdtNhan]
        );

        if (!rows[0]) return null;
        const chiTiet = await this.findOrderItems(rows[0].DonHangId);
        return { ...rows[0], chiTiet };
    },

    async findByUserId(nguoiDungId) {
        const [rows] = await pool.query(
            `SELECT d.*,
                    (SELECT COUNT(*) FROM CHI_TIET_DON_HANG c WHERE c.DonHangId = d.DonHangId) AS SoMatHang
             FROM DON_HANG d
             WHERE d.NguoiDungId = ?
             ORDER BY d.NgayDat DESC, d.DonHangId DESC`,
            [nguoiDungId]
        );
        return rows;
    },

    async findAll({ trangThai, keyword, limit = 15, offset = 0 }) {
        const conditions = [];
        const params = [];

        if (trangThai && trangThai !== 'ALL') {
            conditions.push('d.TrangThai = ?');
            params.push(trangThai);
        }

        if (keyword) {
            conditions.push('(d.MaDon LIKE ? OR d.MaVanDon LIKE ? OR d.HoTenNhan LIKE ? OR d.SdtNhan LIKE ?)');
            const like = `%${keyword}%`;
            params.push(like, like, like, like);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM DON_HANG d ${whereClause}`,
            params
        );
        const total = countRows[0].total;

        const [rows] = await pool.query(
            `SELECT d.*,
                    (SELECT COUNT(*) FROM CHI_TIET_DON_HANG c WHERE c.DonHangId = d.DonHangId) AS SoMatHang
             FROM DON_HANG d
             ${whereClause}
             ORDER BY d.NgayDat DESC, d.DonHangId DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        return { items: rows, total };
    },

    async updateStatus(donHangId, trangThai, extra = {}) {
        const sets = ['TrangThai = ?'];
        const params = [trangThai];

        if (extra.donViVanChuyen !== undefined) {
            sets.push('DonViVanChuyen = ?');
            params.push(extra.donViVanChuyen);
        }
        if (extra.maVanDon !== undefined) {
            sets.push('MaVanDon = ?');
            params.push(extra.maVanDon);
        }
        if (extra.lyDoHoanTien !== undefined) {
            sets.push('LyDoHoanTien = ?');
            params.push(extra.lyDoHoanTien);
        }
        if (extra.phanHoiHoanTien !== undefined) {
            sets.push('PhanHoiHoanTien = ?');
            params.push(extra.phanHoiHoanTien);
        }

        params.push(donHangId);
        const [result] = await pool.query(
            `UPDATE DON_HANG SET ${sets.join(', ')} WHERE DonHangId = ?`,
            params
        );
        return result.affectedRows > 0;
    },

    async cancelByProcedure(donHangId) {
        await pool.query('CALL sp_HuyDonHang(?)', [donHangId]);
    },

    async refundByProcedure(donHangId) {
        await pool.query('CALL sp_HoanTienDonHang(?)', [donHangId]);
    },

    async getDashboardStats() {
        const [spResult] = await pool.query('CALL sp_ThongKeTongQuan()');
        const [statusBreakdown] = await pool.query('SELECT * FROM v_ThongKe_DonTheoTrangThai');

        return {
            tongQuan: spResult[0]?.[0] || {},
            donTheoTrangThai: statusBreakdown
        };
    }
};

module.exports = orderModel;