const { pool } = require('../config/database');
const orderModel = require('../models/orderModel');
const voucherModel = require('../models/voucherModel');
const inventoryService = require('./inventoryService');
const emailService = require('./emailService');
const orderAutomationService = require('./orderAutomationService');
const { buildVietQrInfo } = require('../utils/vietqr');
const AppError = require('../utils/AppError');

const VALID_STATUSES = [
    'CHO_XAC_NHAN',
    'DA_XAC_NHAN',
    'DANG_GIAO',
    'HOAN_THANH',
    'DA_HUY',
    'YEU_CAU_HOAN_TIEN',
    'DA_HOAN_TIEN'
];
const VALID_PAYMENTS = ['COD', 'CHUYEN_KHOAN'];

const CARRIER_PREFIX = {
    'SPX Express': 'SPX',
    'Giao Hàng Nhanh (GHN)': 'GHN',
    'Giao Hàng Tiết Kiệm (GHTK)': 'GHTK',
    'Viettel Post': 'VTP',
    'J&T Express': 'JT'
};

const pad2 = (n) => String(n).padStart(2, '0');
const toLocalYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toLocalYM = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const generateWaybillCode = (carrier, maDon) => {
    const prefix = CARRIER_PREFIX[carrier] || 'SPX';
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${maDon}${rand}`;
};

const orderService = {
    async placeOrder(user, payload) {
        if (!user || !user.id) {
            throw new AppError('Vui lòng đăng nhập tài khoản trước khi đặt hàng.', 401);
        }

        const hoTenNhan = payload.hoTenNhan || payload.tenNguoiNhan;
        const sdtNhan = payload.sdtNhan || payload.soDienThoaiNhan;
        const diaChiNhan = payload.diaChiNhan || payload.diaChiGiaoHang;
        const rawEmail = payload.emailNhan ? String(payload.emailNhan).trim() : '';
        const {
            ghiChu = null,
            phuongThucThanhToan = 'COD',
            maVoucher = null,
            items
        } = payload;

        if (!hoTenNhan || !sdtNhan || !diaChiNhan) {
            throw new AppError('Vui lòng nhập đầy đủ họ tên người nhận, số điện thoại và địa chỉ nhận hàng.', 400);
        }

        if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
            throw new AppError('Địa chỉ email nhận hóa đơn không hợp lệ.', 400);
        }

        if (!VALID_PAYMENTS.includes(phuongThucThanhToan)) {
            throw new AppError('Phương thức thanh toán không hợp lệ (chỉ chấp nhận COD hoặc CHUYEN_KHOAN).', 400);
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError('Giỏ hàng trống, vui lòng chọn ít nhất 1 sản phẩm.', 400);
        }

        const mergedMap = new Map();
        for (const raw of items) {
            const bienTheId = Number(raw.bienTheId);
            const soLuong = Number(raw.soLuong);

            if (!bienTheId || !Number.isInteger(soLuong) || soLuong <= 0) {
                throw new AppError('Dữ liệu biến thể hoặc số lượng đặt mua không hợp lệ.', 400);
            }

            mergedMap.set(bienTheId, (mergedMap.get(bienTheId) || 0) + soLuong);
        }

        const mergedItems = Array.from(mergedMap, ([bienTheId, soLuong]) => ({ bienTheId, soLuong }));

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const validatedItems = await inventoryService.validateAndLockItems(conn, mergedItems);
            const tongTienHang = validatedItems.reduce((sum, item) => sum + item.thanhTien, 0);

            let appliedCode = null;
            let soTienGiam = 0;
            let appliedVoucherId = null;

            if (maVoucher && String(maVoucher).trim()) {
                const validated = await voucherModel.validateVoucher(conn, {
                    maCode: maVoucher,
                    tongTienHang,
                    nguoiDungId: user.id,
                    forUpdate: true
                });
                appliedCode = validated.voucher.MaCode;
                appliedVoucherId = validated.voucher.VoucherId;
                soTienGiam = validated.soTienGiam;
            }

            const tongTien = Math.max(0, tongTienHang - soTienGiam);

            const donHangId = await orderModel.createOrder(conn, {
                nguoiDungId: user.id,
                hoTenNhan: hoTenNhan.trim(),
                sdtNhan: sdtNhan.trim(),
                emailNhan: rawEmail || null,
                diaChiNhan: diaChiNhan.trim(),
                ghiChu: ghiChu ? ghiChu.trim() : null,
                tongTien,
                phuongThucThanhToan,
                maVoucher: appliedCode,
                soTienGiam
            });

            await orderModel.createOrderItems(conn, donHangId, validatedItems);
            await inventoryService.deductStock(conn, validatedItems);

            if (appliedVoucherId) {
                await voucherModel.incrementUsage(conn, appliedVoucherId);
            }

            await conn.commit();

            const autoCfg = orderAutomationService.getConfig();
            let autoConfirmed = false;
            if (phuongThucThanhToan === 'COD' && autoCfg.autoConfirmCod) {
                await orderModel.updateStatus(donHangId, 'DA_XAC_NHAN');
                autoConfirmed = true;
            }

            const createdOrder = await orderModel.findById(donHangId);
            const emailInvoice = await emailService.sendOrderInvoice(createdOrder);
            const vietQr =
                createdOrder.PhuongThucThanhToan === 'CHUYEN_KHOAN'
                    ? buildVietQrInfo(createdOrder)
                    : null;

            return {
                ...createdOrder,
                autoConfirmed,
                vietQr,
                emailInvoice
            };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    async trackOrder(maDon, sdtNhan) {
        if (!maDon || !sdtNhan) {
            throw new AppError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại nhận hàng.', 400);
        }

        const order = await orderModel.findByMaDonAndPhone(
            maDon.trim().toUpperCase(),
            sdtNhan.trim()
        );

        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.', 404);
        }

        return {
            ...order,
            vietQr: order.PhuongThucThanhToan === 'CHUYEN_KHOAN' ? buildVietQrInfo(order) : null
        };
    },

    async getMyOrders(nguoiDungId) {
        return await orderModel.findByUserId(nguoiDungId);
    },

    async getOrderDetail(donHangId, user) {
        const order = await orderModel.findById(donHangId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (user.vaiTro !== 'ADMIN' && order.NguoiDungId !== user.id) {
            throw new AppError('Bạn không có quyền xem đơn hàng này.', 403);
        }

        return {
            ...order,
            vietQr: order.PhuongThucThanhToan === 'CHUYEN_KHOAN' ? buildVietQrInfo(order) : null
        };
    },

    async getAllOrders(query) {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 15));
        const offset = (page - 1) * limit;

        const { items, total } = await orderModel.findAll({
            trangThai: query.trangThai,
            keyword: query.keyword ? query.keyword.trim() : '',
            limit,
            offset
        });

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    async shipOrder(donHangId, { donViVanChuyen, maVanDon } = {}) {
        const current = await orderModel.findById(donHangId);
        if (!current) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (current.TrangThai === 'CHO_XAC_NHAN') {
            await orderModel.updateStatus(donHangId, 'DA_XAC_NHAN');
        } else if (current.TrangThai !== 'DA_XAC_NHAN') {
            throw new AppError('Chỉ bàn giao đơn vị vận chuyển được đơn ở trạng thái Đã xác nhận.', 400);
        }

        const carrier = (donViVanChuyen || current.DonViVanChuyen || 'SPX Express').trim();
        const waybill = (maVanDon || current.MaVanDon || generateWaybillCode(carrier, current.MaDon)).trim().toUpperCase();

        await orderModel.updateStatus(donHangId, 'DANG_GIAO', {
            donViVanChuyen: carrier,
            maVanDon: waybill
        });

        const updated = await orderModel.findById(donHangId);
        const autoCfg = orderAutomationService.getConfig();
        if (autoCfg.sendStatusEmails) {
            emailService
                .sendOrderStatusUpdate(
                    updated,
                    `Kiện hàng đã được đóng gói và bàn giao cho ${carrier} (Mã vận đơn: ${waybill}).`
                )
                .catch(() => {});
        }

        return updated;
    },

    async updateOrderStatus(donHangId, trangThai, options = {}) {
        if (!VALID_STATUSES.includes(trangThai)) {
            throw new AppError('Trạng thái đơn hàng không hợp lệ.', 400);
        }

        const current = await orderModel.findById(donHangId);
        if (!current) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (trangThai === 'DA_HUY') {
            return await this.cancelOrder(donHangId, { vaiTro: 'ADMIN' }, options);
        }

        if (trangThai === 'DANG_GIAO') {
            return await this.shipOrder(donHangId, {
                donViVanChuyen: options.donViVanChuyen,
                maVanDon: options.maVanDon
            });
        }

        try {
            await orderModel.updateStatus(donHangId, trangThai, options.extra || {});
            const updated = await orderModel.findById(donHangId);

            const autoCfg = orderAutomationService.getConfig();
            if (autoCfg.sendStatusEmails && !options.skipEmail) {
                emailService.sendOrderStatusUpdate(updated, options.noteText || '').catch(() => {});
            }

            return updated;
        } catch (error) {
            if (error.sqlState === '45000' || error.errno === 1644) {
                throw new AppError(error.sqlMessage, 400);
            }
            throw error;
        }
    },

    async bulkUpdateStatus(ids, trangThai) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new AppError('Vui lòng chọn ít nhất 1 đơn hàng để xử lý hàng loạt.', 400);
        }
        if (!VALID_STATUSES.includes(trangThai)) {
            throw new AppError('Trạng thái cần chuyển đổi không hợp lệ.', 400);
        }

        const uniqueIds = Array.from(new Set(ids.map((id) => Number(id)).filter((n) => n > 0)));
        let updatedCount = 0;
        const skipped = [];

        for (const id of uniqueIds) {
            try {
                await this.updateOrderStatus(id, trangThai);
                updatedCount++;
            } catch (err) {
                skipped.push({ id, reason: err.message });
            }
        }

        return {
            updatedCount,
            skippedCount: skipped.length,
            skipped
        };
    },

    async confirmOrderReceived(donHangId, user) {
        const order = await orderModel.findById(donHangId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (user.vaiTro !== 'ADMIN' && order.NguoiDungId !== user.id) {
            throw new AppError('Bạn không có quyền xác nhận đơn hàng này.', 403);
        }

        if (order.TrangThai !== 'DANG_GIAO') {
            throw new AppError('Chỉ có thể xác nhận đã nhận hàng khi đơn đang ở trạng thái Đang giao hàng.', 400);
        }

        return await this.updateOrderStatus(donHangId, 'HOAN_THANH', {
            noteText: 'Khách hàng đã kiểm tra và xác nhận nhận đủ hàng trên hệ thống.'
        });
    },

    async requestRefund(donHangId, user, lyDoHoanTien) {
        const reason = String(lyDoHoanTien || '').trim();
        if (!reason) {
            throw new AppError('Vui lòng nhập lý do yêu cầu trả hàng / hoàn tiền.', 400);
        }

        const order = await orderModel.findById(donHangId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (user.vaiTro !== 'ADMIN' && order.NguoiDungId !== user.id) {
            throw new AppError('Bạn không có quyền gửi yêu cầu hoàn tiền cho đơn hàng này.', 403);
        }

        if (order.TrangThai !== 'HOAN_THANH') {
            throw new AppError('Chỉ có thể yêu cầu trả hàng / hoàn tiền sau khi đơn hàng đã giao hoàn thành.', 400);
        }

        return await this.updateOrderStatus(donHangId, 'YEU_CAU_HOAN_TIEN', {
            extra: { lyDoHoanTien: reason },
            noteText: `Khách hàng gửi yêu cầu trả hàng / hoàn tiền: "${reason}".`
        });
    },

    async processRefund(donHangId, { action, phanHoiHoanTien } = {}) {
        const order = await orderModel.findById(donHangId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }
        if (order.TrangThai !== 'YEU_CAU_HOAN_TIEN') {
            throw new AppError('Đơn hàng này không ở trạng thái Yêu cầu hoàn tiền.', 400);
        }

        const replyNote = String(phanHoiHoanTien || '').trim();

        if (action === 'APPROVE') {
            try {
                await orderModel.refundByProcedure(donHangId);
                if (order.MaVoucher) {
                    await voucherModel.decrementUsageByCode(order.MaVoucher);
                }
                if (replyNote) {
                    await orderModel.updateStatus(donHangId, 'DA_HOAN_TIEN', {
                        phanHoiHoanTien: replyNote
                    });
                }
                const refunded = await orderModel.findById(donHangId);
                const autoCfg = orderAutomationService.getConfig();
                if (autoCfg.sendStatusEmails) {
                    emailService
                        .sendOrderStatusUpdate(
                            refunded,
                            replyNote || 'Shop đã chấp nhận yêu cầu trả hàng và hoàn tiền cho đơn hàng của bạn.'
                        )
                        .catch(() => {});
                }
                return refunded;
            } catch (error) {
                if (error.sqlState === '45000' || error.errno === 1644) {
                    throw new AppError(error.sqlMessage, 400);
                }
                throw error;
            }
        }

        if (action === 'REJECT') {
            return await this.updateOrderStatus(donHangId, 'HOAN_THANH', {
                extra: {
                    phanHoiHoanTien:
                        replyNote || 'Yêu cầu trả hàng chưa đủ điều kiện áp dụng theo chính sách cửa hàng.'
                },
                noteText:
                    replyNote || 'Yêu cầu trả hàng / hoàn tiền đã bị từ chối sau khi kiểm tra thông tin.'
            });
        }

        throw new AppError('Thao tác xử lý hoàn tiền không hợp lệ (chỉ chấp nhận APPROVE hoặc REJECT).', 400);
    },

    async cancelOrder(donHangId, user, options = {}) {
        const order = await orderModel.findById(donHangId);
        if (!order) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (user.vaiTro !== 'ADMIN') {
            if (order.NguoiDungId !== user.id) {
                throw new AppError('Bạn không có quyền hủy đơn hàng này.', 403);
            }
            if (order.TrangThai !== 'CHO_XAC_NHAN') {
                throw new AppError('Bạn chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xác nhận.', 400);
            }
        }

        try {
            await orderModel.cancelByProcedure(donHangId);
            if (order.MaVoucher) {
                await voucherModel.decrementUsageByCode(order.MaVoucher);
            }
            const cancelled = await orderModel.findById(donHangId);

            const autoCfg = orderAutomationService.getConfig();
            if (autoCfg.sendStatusEmails && !options.skipEmail) {
                emailService.sendOrderStatusUpdate(cancelled, options.noteText || '').catch(() => {});
            }

            return cancelled;
        } catch (error) {
            if (error.sqlState === '45000' || error.errno === 1644) {
                throw new AppError(error.sqlMessage, 400);
            }
            throw error;
        }
    },

    async getDashboardStats() {
        const [stats, sapHetHang, [dailyRows], [monthlyRows], [topProductRows]] = await Promise.all([
            orderModel.getDashboardStats(),
            inventoryService.getLowStockVariants(5),
            pool.query(`
                SELECT
                    DATE_FORMAT(NgayDat, '%Y-%m-%d') AS Ngay,
                    COUNT(*) AS TongDon,
                    SUM(CASE WHEN TrangThai = 'HOAN_THANH' THEN 1 ELSE 0 END) AS DonHoanThanh,
                    COALESCE(SUM(CASE WHEN TrangThai = 'HOAN_THANH' THEN TongTien ELSE 0 END), 0) AS DoanhThuHoanThanh,
                    COALESCE(SUM(CASE WHEN TrangThai NOT IN ('DA_HUY', 'DA_HOAN_TIEN') THEN TongTien ELSE 0 END), 0) AS DoanhThuHopLe
                FROM don_hang
                WHERE NgayDat >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
                GROUP BY DATE_FORMAT(NgayDat, '%Y-%m-%d')
                ORDER BY Ngay ASC
            `),
            pool.query(`
                SELECT
                    DATE_FORMAT(NgayDat, '%Y-%m') AS Thang,
                    COUNT(*) AS TongDon,
                    SUM(CASE WHEN TrangThai = 'HOAN_THANH' THEN 1 ELSE 0 END) AS DonHoanThanh,
                    COALESCE(SUM(CASE WHEN TrangThai = 'HOAN_THANH' THEN TongTien ELSE 0 END), 0) AS DoanhThuHoanThanh,
                    COALESCE(SUM(CASE WHEN TrangThai NOT IN ('DA_HUY', 'DA_HOAN_TIEN') THEN TongTien ELSE 0 END), 0) AS DoanhThuHopLe
                FROM don_hang
                WHERE NgayDat >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 11 MONTH), '%Y-%m-01')
                GROUP BY DATE_FORMAT(NgayDat, '%Y-%m')
                ORDER BY Thang ASC
            `),
            pool.query(`
                SELECT
                    sp.SanPhamId,
                    sp.TenSanPham,
                    sp.AnhUrl,
                    sp.Gia,
                    dm.TenDanhMuc,
                    COALESCE(SUM(ct.SoLuong), 0) AS TongDaBan,
                    COALESCE(SUM(ct.SoLuong * ct.DonGia), 0) AS DoanhThuSanPham,
                    COUNT(DISTINCT dh.DonHangId) AS SoDonHang
                FROM chi_tiet_don_hang ct
                JOIN don_hang dh ON ct.DonHangId = dh.DonHangId
                JOIN bien_the bt ON ct.BienTheId = bt.BienTheId
                JOIN san_pham sp ON bt.SanPhamId = sp.SanPhamId
                LEFT JOIN danh_muc dm ON sp.DanhMucId = dm.DanhMucId
                WHERE dh.TrangThai NOT IN ('DA_HUY', 'DA_HOAN_TIEN')
                GROUP BY sp.SanPhamId, sp.TenSanPham, sp.AnhUrl, sp.Gia, dm.TenDanhMuc
                ORDER BY TongDaBan DESC, DoanhThuSanPham DESC
                LIMIT 8
            `)
        ]);

        const dailyMap = new Map(dailyRows.map((r) => [r.Ngay, r]));
        const doanhThuTheoNgay = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            const key = toLocalYMD(d);
            const found = dailyMap.get(key);
            doanhThuTheoNgay.push({
                key,
                label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
                fullLabel: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
                tongDon: Number(found?.TongDon || 0),
                donHoanThanh: Number(found?.DonHoanThanh || 0),
                doanhThuHoanThanh: Number(found?.DoanhThuHoanThanh || 0),
                doanhThuHopLe: Number(found?.DoanhThuHopLe || 0)
            });
        }

        const monthlyMap = new Map(monthlyRows.map((r) => [r.Thang, r]));
        const doanhThuTheoThang = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = toLocalYM(d);
            const found = monthlyMap.get(key);
            doanhThuTheoThang.push({
                key,
                label: `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`,
                fullLabel: `Tháng ${pad2(d.getMonth() + 1)}/${d.getFullYear()}`,
                tongDon: Number(found?.TongDon || 0),
                donHoanThanh: Number(found?.DonHoanThanh || 0),
                doanhThuHoanThanh: Number(found?.DoanhThuHoanThanh || 0),
                doanhThuHopLe: Number(found?.DoanhThuHopLe || 0)
            });
        }

        const topSanPhamBanChay = topProductRows.map((row) => ({
            ...row,
            Gia: Number(row.Gia || 0),
            TongDaBan: Number(row.TongDaBan || 0),
            DoanhThuSanPham: Number(row.DoanhThuSanPham || 0),
            SoDonHang: Number(row.SoDonHang || 0)
        }));

        return {
            ...stats,
            sapHetHang,
            doanhThuTheoNgay,
            doanhThuTheoThang,
            topSanPhamBanChay
        };
    }
};

module.exports = orderService;