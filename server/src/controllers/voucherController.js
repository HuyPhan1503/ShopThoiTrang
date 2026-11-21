const { pool } = require('../config/database');
const voucherModel = require('../models/voucherModel');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const normalizePayload = (body) => {
    const maCode = String(body.maCode || '').trim().toUpperCase();
    const moTa = body.moTa ? String(body.moTa).trim() : null;
    const loaiGiam = body.loaiGiam === 'PHAN_TRAM' ? 'PHAN_TRAM' : 'TIEN';
    const giaTriGiam = Number(body.giaTriGiam) || 0;
    const giamToiDa = loaiGiam === 'PHAN_TRAM' && Number(body.giamToiDa) > 0 ? Number(body.giamToiDa) : null;
    const donToiThieu = Math.max(0, Number(body.donToiThieu) || 0);
    const soLuong = Math.max(1, Number(body.soLuong) || 1);
    const ngayBatDau = body.ngayBatDau;
    const ngayKetThuc = body.ngayKetThuc;
    const trangThai = body.trangThai === 0 || body.trangThai === false ? 0 : 1;

    if (!maCode) throw new AppError('Vui lòng nhập mã code giảm giá.', 400);
    if (giaTriGiam <= 0) throw new AppError('Giá trị giảm phải lớn hơn 0.', 400);
    if (loaiGiam === 'PHAN_TRAM' && giaTriGiam > 100) {
        throw new AppError('Phần trăm giảm giá không được vượt quá 100%.', 400);
    }
    if (!ngayBatDau || !ngayKetThuc) {
        throw new AppError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', 400);
    }
    if (new Date(ngayKetThuc) <= new Date(ngayBatDau)) {
        throw new AppError('Ngày kết thúc phải sau ngày bắt đầu.', 400);
    }

    return {
        maCode,
        moTa,
        loaiGiam,
        giaTriGiam,
        giamToiDa,
        donToiThieu,
        soLuong,
        ngayBatDau,
        ngayKetThuc,
        trangThai
    };
};

const voucherController = {
    getPublicVouchers: asyncHandler(async (req, res) => {
        const list = await voucherModel.findPublicActive();
        res.json({ success: true, data: list });
    }),

    applyVoucher: asyncHandler(async (req, res) => {
        const { maCode, tongTienHang } = req.body;
        const subtotal = Number(tongTienHang) || 0;
        if (subtotal <= 0) {
            throw new AppError('Giá trị đơn hàng không hợp lệ.', 400);
        }

        const { voucher, soTienGiam } = await voucherModel.validateVoucher(pool, {
            maCode,
            tongTienHang: subtotal,
            nguoiDungId: req.user ? req.user.id : null,
            forUpdate: false
        });

        res.json({
            success: true,
            message: `Áp dụng mã ${voucher.MaCode} thành công!`,
            data: {
                maCode: voucher.MaCode,
                moTa: voucher.MoTa,
                loaiGiam: voucher.LoaiGiam,
                giaTriGiam: Number(voucher.GiaTriGiam),
                giamToiDa: voucher.GiamToiDa ? Number(voucher.GiamToiDa) : null,
                soTienGiam,
                tongSauGiam: Math.max(0, subtotal - soTienGiam)
            }
        });
    }),

    getAllAdmin: asyncHandler(async (req, res) => {
        const list = await voucherModel.findAllWithStats();
        res.json({ success: true, data: list });
    }),

    createVoucher: asyncHandler(async (req, res) => {
        const payload = normalizePayload(req.body);
        try {
            const created = await voucherModel.create(payload);
            res.status(201).json({
                success: true,
                message: 'Tạo mã giảm giá thành công.',
                data: created
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new AppError(`Mã giảm giá "${payload.maCode}" đã tồn tại.`, 400);
            }
            throw err;
        }
    }),

    updateVoucher: asyncHandler(async (req, res) => {
        const payload = normalizePayload(req.body);
        try {
            const updated = await voucherModel.update(req.params.id, payload);
            res.json({
                success: true,
                message: 'Cập nhật mã giảm giá thành công.',
                data: updated
            });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                throw new AppError(`Mã giảm giá "${payload.maCode}" đã tồn tại.`, 400);
            }
            throw err;
        }
    }),

    deleteVoucher: asyncHandler(async (req, res) => {
        await voucherModel.remove(req.params.id);
        res.json({ success: true, message: 'Đã xóa mã giảm giá.' });
    })
};

module.exports = voucherController;