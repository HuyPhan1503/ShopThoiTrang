const { pool } = require('../config/database');
const AppError = require('../utils/AppError');

const voucherModel = {
    calculateDiscount(voucher, tongTienHang) {
        let soTienGiam = 0;
        if (voucher.LoaiGiam === 'TIEN') {
            soTienGiam = Number(voucher.GiaTriGiam) || 0;
        } else {
            const raw = Math.floor((tongTienHang * Number(voucher.GiaTriGiam)) / 100);
            const maxCap = Number(voucher.GiamToiDa) || 0;
            soTienGiam = maxCap > 0 ? Math.min(raw, maxCap) : raw;
        }
        return Math.max(0, Math.min(soTienGiam, tongTienHang));
    },

    async validateVoucher(dbConn, { maCode, tongTienHang, nguoiDungId = null, forUpdate = false }) {
        if (!maCode || !String(maCode).trim()) {
            throw new AppError('Vui lòng nhập mã giảm giá.', 400);
        }

        const code = String(maCode).trim().toUpperCase();
        const lockSql = forUpdate ? 'FOR UPDATE' : '';

        const [rows] = await dbConn.query(
            `SELECT * FROM MA_GIAM_GIA WHERE MaCode = ? LIMIT 1 ${lockSql}`,
            [code]
        );
        const voucher = rows[0];

        if (!voucher || Number(voucher.TrangThai) !== 1) {
            throw new AppError('Mã giảm giá không tồn tại hoặc đã ngừng áp dụng.', 400);
        }

        const now = new Date();
        if (new Date(voucher.NgayBatDau) > now) {
            throw new AppError('Mã giảm giá này chưa đến thời gian áp dụng.', 400);
        }
        if (new Date(voucher.NgayKetThuc) < now) {
            throw new AppError('Mã giảm giá đã hết hạn sử dụng.', 400);
        }

        if (Number(voucher.DaSuDung) >= Number(voucher.SoLuong)) {
            throw new AppError('Mã giảm giá đã hết lượt sử dụng.', 400);
        }

        const minOrder = Number(voucher.DonToiThieu) || 0;
        if (tongTienHang < minOrder) {
            throw new AppError(
                `Đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')} đ để áp dụng mã ${code}.`,
                400
            );
        }

        if (nguoiDungId) {
            const [usedRows] = await dbConn.query(
                `SELECT COUNT(*) AS cnt
                 FROM DON_HANG
                 WHERE NguoiDungId = ? AND MaVoucher = ? AND TrangThai <> 'DA_HUY'`,
                [nguoiDungId, code]
            );
            if (usedRows[0].cnt > 0) {
                throw new AppError(`Bạn đã sử dụng mã ${code} cho một đơn hàng trước đó.`, 400);
            }
        }

        const soTienGiam = this.calculateDiscount(voucher, tongTienHang);
        return { voucher, soTienGiam };
    },

    async findPublicActive() {
        const [rows] = await pool.query(
            `SELECT VoucherId, MaCode, MoTa, LoaiGiam, GiaTriGiam, GiamToiDa, DonToiThieu,
                    (SoLuong - DaSuDung) AS ConLai, NgayKetThuc
             FROM MA_GIAM_GIA
             WHERE TrangThai = 1
               AND NgayBatDau <= NOW()
               AND NgayKetThuc >= NOW()
               AND DaSuDung < SoLuong
             ORDER BY DonToiThieu ASC, GiaTriGiam DESC`
        );
        return rows;
    },

    async findAllWithStats() {
        const [rows] = await pool.query(
            `SELECT m.*,
                    COALESCE(SUM(CASE WHEN d.TrangThai <> 'DA_HUY' THEN 1 ELSE 0 END), 0) AS DonApDung,
                    COALESCE(SUM(CASE WHEN d.TrangThai <> 'DA_HUY' THEN d.SoTienGiam ELSE 0 END), 0) AS TongTienDaGiam,
                    COALESCE(SUM(CASE WHEN d.TrangThai = 'HOAN_THANH' THEN d.TongTien ELSE 0 END), 0) AS DoanhThuMangLai
             FROM MA_GIAM_GIA m
             LEFT JOIN DON_HANG d ON d.MaVoucher = m.MaCode
             GROUP BY m.VoucherId
             ORDER BY m.VoucherId DESC`
        );
        return rows;
    },

    async create(data) {
        const [result] = await pool.query(
            `INSERT INTO MA_GIAM_GIA
             (MaCode, MoTa, LoaiGiam, GiaTriGiam, GiamToiDa, DonToiThieu, SoLuong, NgayBatDau, NgayKetThuc, TrangThai)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.maCode,
                data.moTa,
                data.loaiGiam,
                data.giaTriGiam,
                data.giamToiDa,
                data.donToiThieu,
                data.soLuong,
                data.ngayBatDau,
                data.ngayKetThuc,
                data.trangThai
            ]
        );
        const [rows] = await pool.query('SELECT * FROM MA_GIAM_GIA WHERE VoucherId = ?', [result.insertId]);
        return rows[0];
    },

    async update(id, data) {
        const [result] = await pool.query(
            `UPDATE MA_GIAM_GIA
             SET MaCode = ?, MoTa = ?, LoaiGiam = ?, GiaTriGiam = ?, GiamToiDa = ?,
                 DonToiThieu = ?, SoLuong = ?, NgayBatDau = ?, NgayKetThuc = ?, TrangThai = ?
             WHERE VoucherId = ?`,
            [
                data.maCode,
                data.moTa,
                data.loaiGiam,
                data.giaTriGiam,
                data.giamToiDa,
                data.donToiThieu,
                data.soLuong,
                data.ngayBatDau,
                data.ngayKetThuc,
                data.trangThai,
                id
            ]
        );
        if (result.affectedRows === 0) {
            throw new AppError('Không tìm thấy mã giảm giá.', 404);
        }
        const [rows] = await pool.query('SELECT * FROM MA_GIAM_GIA WHERE VoucherId = ?', [id]);
        return rows[0];
    },

    async remove(id) {
        const [result] = await pool.query('DELETE FROM MA_GIAM_GIA WHERE VoucherId = ?', [id]);
        if (result.affectedRows === 0) {
            throw new AppError('Không tìm thấy mã giảm giá.', 404);
        }
    },

    async incrementUsage(conn, voucherId) {
        await conn.query('UPDATE MA_GIAM_GIA SET DaSuDung = DaSuDung + 1 WHERE VoucherId = ?', [voucherId]);
    },

    async decrementUsageByCode(maCode) {
        if (!maCode) return;
        await pool.query(
            'UPDATE MA_GIAM_GIA SET DaSuDung = GREATEST(0, DaSuDung - 1) WHERE MaCode = ?',
            [maCode]
        );
    }
};

module.exports = voucherModel;