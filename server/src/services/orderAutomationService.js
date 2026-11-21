const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const orderModel = require('../models/orderModel');
const voucherModel = require('../models/voucherModel');
const emailService = require('./emailService');
const AppError = require('../utils/AppError');

const CONFIG_PATH = path.join(__dirname, '../../automation-config.json');

const CARRIER_PREFIX = {
    'SPX Express': 'SPX',
    'Giao Hàng Nhanh (GHN)': 'GHN',
    'Giao Hàng Tiết Kiệm (GHTK)': 'GHTK',
    'Viettel Post': 'VTP',
    'J&T Express': 'JT'
};

const DEFAULT_CONFIG = {
    autoConfirmCod: true,
    autoShipAfterPayment: true,
    defaultCarrier: 'SPX Express',
    autoCancelUnpaidHours: 24,
    autoCompleteShippingDays: 3,
    sendStatusEmails: true
};

let schedulerTimer = null;
let lastRunSummary = null;

const generateWaybillCode = (carrier, maDon) => {
    const prefix = CARRIER_PREFIX[carrier] || 'SPX';
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}${maDon}${rand}`;
};

const extractOrderCode = (rawText) => {
    if (!rawText) return '';
    const match = String(rawText).toUpperCase().match(/DH\d{4,10}/);
    return match ? match[0] : '';
};

const orderAutomationService = {
    getConfig() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                return {
                    autoConfirmCod: raw.autoConfirmCod !== undefined ? Boolean(raw.autoConfirmCod) : DEFAULT_CONFIG.autoConfirmCod,
                    autoShipAfterPayment: raw.autoShipAfterPayment !== undefined ? Boolean(raw.autoShipAfterPayment) : DEFAULT_CONFIG.autoShipAfterPayment,
                    defaultCarrier: raw.defaultCarrier || DEFAULT_CONFIG.defaultCarrier,
                    autoCancelUnpaidHours: Math.max(0, Number(raw.autoCancelUnpaidHours ?? DEFAULT_CONFIG.autoCancelUnpaidHours)),
                    autoCompleteShippingDays: Math.max(0, Number(raw.autoCompleteShippingDays ?? DEFAULT_CONFIG.autoCompleteShippingDays)),
                    sendStatusEmails: raw.sendStatusEmails !== undefined ? Boolean(raw.sendStatusEmails) : DEFAULT_CONFIG.sendStatusEmails
                };
            }
        } catch (err) {
            console.error('[Automation Config Read Error]:', err.message);
        }
        return { ...DEFAULT_CONFIG };
    },

    updateConfig(partial) {
        const current = this.getConfig();
        const next = {
            autoConfirmCod: partial.autoConfirmCod !== undefined ? Boolean(partial.autoConfirmCod) : current.autoConfirmCod,
            autoShipAfterPayment: partial.autoShipAfterPayment !== undefined ? Boolean(partial.autoShipAfterPayment) : current.autoShipAfterPayment,
            defaultCarrier: partial.defaultCarrier ? String(partial.defaultCarrier).trim() : current.defaultCarrier,
            autoCancelUnpaidHours: partial.autoCancelUnpaidHours !== undefined
                ? Math.max(0, Math.min(720, Number(partial.autoCancelUnpaidHours) || 0))
                : current.autoCancelUnpaidHours,
            autoCompleteShippingDays: partial.autoCompleteShippingDays !== undefined
                ? Math.max(0, Math.min(90, Number(partial.autoCompleteShippingDays) || 0))
                : current.autoCompleteShippingDays,
            sendStatusEmails: partial.sendStatusEmails !== undefined ? Boolean(partial.sendStatusEmails) : current.sendStatusEmails
        };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
        return next;
    },

    getStatus() {
        return {
            config: this.getConfig(),
            schedulerActive: Boolean(schedulerTimer),
            lastRunSummary
        };
    },

    async confirmAndAutoDispatchPaidOrder(donHangId, sourceLabel = 'VietQR') {
        const cfg = this.getConfig();
        const current = await orderModel.findById(donHangId);
        if (!current) {
            throw new AppError('Không tìm thấy đơn hàng.', 404);
        }

        if (current.TrangThai !== 'CHO_XAC_NHAN') {
            return { order: current, alreadyProcessed: true };
        }

        // Bước 1: Xác nhận đã nhận tiền chuyển khoản
        await orderModel.updateStatus(donHangId, 'DA_XAC_NHAN');

        let noteText = `Hệ thống đã tự động nhận diện thanh toán chuyển khoản (${sourceLabel}) và duyệt đơn hàng.`;

        // Bước 2: Tự động phân công ĐVVC & cấp mã vận đơn nếu bật cấu hình
        if (cfg.autoShipAfterPayment) {
            const carrier = cfg.defaultCarrier || 'SPX Express';
            const waybill = generateWaybillCode(carrier, current.MaDon);
            await orderModel.updateStatus(donHangId, 'DANG_GIAO', {
                donViVanChuyen: carrier,
                maVanDon: waybill
            });
            noteText = `Hệ thống đã tự động nhận diện thanh toán (${sourceLabel}), lên đơn và bàn giao cho ${carrier} (Mã vận đơn: ${waybill}).`;
        }

        const updated = await orderModel.findById(donHangId);
        if (updated && cfg.sendStatusEmails) {
            emailService.sendOrderStatusUpdate(updated, noteText).catch(() => {});
        }

        return { order: updated, alreadyProcessed: false, autoShipped: cfg.autoShipAfterPayment };
    },

    async handleBankTransferWebhook(payload = {}) {
        // Hỗ trợ đồng thời chuẩn SePay, Casso và Sandbox nội bộ
        const item = Array.isArray(payload.data) ? payload.data[0] || {} : payload;

        if (item.transferType && String(item.transferType).toLowerCase() !== 'in') {
            return { ignored: true, reason: 'Bỏ qua giao dịch tiền ra (transferType != in).' };
        }

        const rawContent = item.content || item.description || item.addInfo || item.maDon || '';
        const maDon = extractOrderCode(rawContent);
        if (!maDon) {
            throw new AppError('Không tìm thấy mã đơn hàng hợp lệ (ví dụ: DH000015) trong nội dung chuyển khoản.', 400);
        }

        const [rows] = await pool.query('SELECT DonHangId, MaDon, TongTien, PhuongThucThanhToan, TrangThai FROM DON_HANG WHERE MaDon = ? LIMIT 1', [maDon]);
        const found = rows[0];
        if (!found) {
            throw new AppError(`Không tìm thấy đơn hàng #${maDon} trên hệ thống.`, 404);
        }

        const receivedAmount = Number(item.transferAmount ?? item.amount ?? found.TongTien);
        const expectedAmount = Number(found.TongTien || 0);
        if (receivedAmount > 0 && receivedAmount < expectedAmount) {
            throw new AppError(
                `Số tiền chuyển khoản (${receivedAmount.toLocaleString('vi-VN')} đ) chưa đủ so với giá trị đơn #${maDon} (${expectedAmount.toLocaleString('vi-VN')} đ).`,
                400
            );
        }

        const gatewayName = item.gateway || (payload.sandbox ? 'VietinBank Sandbox' : 'VietQR Webhook');
        const result = await this.confirmAndAutoDispatchPaidOrder(found.DonHangId, gatewayName);

        return {
            ignored: false,
            ...result
        };
    },

    async runScheduledTasks() {
        const cfg = this.getConfig();
        let autoCancelledCount = 0;
        let autoCompletedCount = 0;

        if (cfg.autoCancelUnpaidHours > 0) {
            const [expiredOrders] = await pool.query(
                `SELECT DonHangId, MaDon, MaVoucher
                 FROM DON_HANG
                 WHERE PhuongThucThanhToan = 'CHUYEN_KHOAN'
                   AND TrangThai = 'CHO_XAC_NHAN'
                   AND NgayDat <= DATE_SUB(NOW(), INTERVAL ? HOUR)`,
                [cfg.autoCancelUnpaidHours]
            );

            for (const row of expiredOrders) {
                try {
                    await orderModel.cancelByProcedure(row.DonHangId);
                    if (row.MaVoucher) {
                        await voucherModel.decrementUsageByCode(row.MaVoucher);
                    }
                    autoCancelledCount++;
                    if (cfg.sendStatusEmails) {
                        const cancelledOrder = await orderModel.findById(row.DonHangId);
                        if (cancelledOrder) {
                            await emailService.sendOrderStatusUpdate(
                                cancelledOrder,
                                `Đơn hàng tự động hủy do quá thời hạn thanh toán chuyển khoản (${cfg.autoCancelUnpaidHours} giờ).`
                            );
                        }
                    }
                } catch (err) {
                    console.error(`[Auto-Cancel #${row.MaDon} Error]:`, err.message);
                }
            }
        }

        if (cfg.autoCompleteShippingDays > 0) {
            const [shippingOrders] = await pool.query(
                `SELECT DonHangId, MaDon
                 FROM DON_HANG
                 WHERE TrangThai = 'DANG_GIAO'
                   AND COALESCE(NgayBanGiao, NgayCapNhat, NgayDat) <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
                [cfg.autoCompleteShippingDays]
            );

            for (const row of shippingOrders) {
                try {
                    await orderModel.updateStatus(row.DonHangId, 'HOAN_THANH');
                    autoCompletedCount++;
                    if (cfg.sendStatusEmails) {
                        const completedOrder = await orderModel.findById(row.DonHangId);
                        if (completedOrder) {
                            await emailService.sendOrderStatusUpdate(
                                completedOrder,
                                'Hệ thống tự động xác nhận hoàn thành đơn hàng sau thời gian giao hàng tiêu chuẩn.'
                            );
                        }
                    }
                } catch (err) {
                    console.error(`[Auto-Complete #${row.MaDon} Error]:`, err.message);
                }
            }
        }

        lastRunSummary = {
            ranAt: new Date().toISOString(),
            autoCancelledCount,
            autoCompletedCount
        };

        return lastRunSummary;
    },

    async reconcileBankTransfers(maDonInput = '') {
        const cleanCode = extractOrderCode(maDonInput) || String(maDonInput || '').trim().toUpperCase();

        let query = `
            SELECT DonHangId, MaDon
            FROM DON_HANG
            WHERE PhuongThucThanhToan = 'CHUYEN_KHOAN'
              AND TrangThai = 'CHO_XAC_NHAN'
        `;
        const params = [];

        if (cleanCode) {
            query += ' AND MaDon = ?';
            params.push(cleanCode);
        }

        const [rows] = await pool.query(query, params);
        const confirmedOrders = [];

        for (const row of rows) {
            const res = await this.confirmAndAutoDispatchPaidOrder(row.DonHangId, 'Đối soát VietQR');
            if (res.order) {
                confirmedOrders.push(res.order);
            }
        }

        return {
            matchedCount: confirmedOrders.length,
            orders: confirmedOrders
        };
    },

    startScheduler() {
        if (schedulerTimer) return;
        setTimeout(() => {
            this.runScheduledTasks().catch((err) => console.error('[Automation Init Error]:', err.message));
        }, 15000);

        schedulerTimer = setInterval(() => {
            this.runScheduledTasks().catch((err) => console.error('[Automation Interval Error]:', err.message));
        }, 5 * 60 * 1000);
    }
};

module.exports = orderAutomationService;