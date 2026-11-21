const nodemailer = require('nodemailer');
const { buildVietQrInfo } = require('../utils/vietqr');

let cachedTestAccount = null;

const formatVnd = (val) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;

const STATUS_LABELS = {
    CHO_XAC_NHAN: 'Chờ xác nhận',
    DA_XAC_NHAN: 'Đã xác nhận & Đang chuẩn bị gói hàng',
    DANG_GIAO: 'Đã bàn giao ĐVVC & Đang giao hàng',
    HOAN_THANH: 'Giao hàng thành công (Hoàn thành)',
    DA_HUY: 'Đã hủy',
    YEU_CAU_HOAN_TIEN: 'Đang yêu cầu Trả hàng / Hoàn tiền',
    DA_HOAN_TIEN: 'Đã chấp nhận Trả hàng / Hoàn tiền'
};

const getTransporter = async () => {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            transporter: nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            }),
            fromAddress: `"ShopThoiTrang" <${process.env.SMTP_USER}>`,
            isTestMode: false
        };
    }

    if (!cachedTestAccount) {
        cachedTestAccount = await nodemailer.createTestAccount();
    }

    return {
        transporter: nodemailer.createTransport({
            host: cachedTestAccount.smtp.host,
            port: cachedTestAccount.smtp.port,
            secure: cachedTestAccount.smtp.secure,
            auth: {
                user: cachedTestAccount.user,
                pass: cachedTestAccount.pass
            }
        }),
        fromAddress: `"ShopThoiTrang" <${cachedTestAccount.user}>`,
        isTestMode: true
    };
};

const buildInvoiceHtml = (order) => {
    const soTienGiam = Number(order.SoTienGiam || 0);
    const tamTinh =
        (order.chiTiet || []).reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0) ||
        Number(order.TongTien || 0) + soTienGiam;

    const itemRows = (order.chiTiet || [])
        .map(
            (item) => `
            <tr>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
                    <strong>${item.TenSanPham}</strong><br/>
                    <span style="color:#6b7280;font-size:12px;">Phân loại: ${item.Size} - ${item.Mau}</span>
                </td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.SoLuong}</td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatVnd(item.DonGia)}</td>
                <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;"><strong>${formatVnd(item.ThanhTien)}</strong></td>
            </tr>`
        )
        .join('');

    let qrBlock = '';
    if (order.PhuongThucThanhToan === 'CHUYEN_KHOAN') {
        const qr = buildVietQrInfo(order);
        qrBlock = `
            <div style="margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;text-align:center;">
                <h3 style="margin:0 0 8px;color:#0f172a;font-size:16px;">Thông tin thanh toán chuyển khoản VietQR</h3>
                <p style="margin:0 0 12px;color:#475569;font-size:13px;">
                    Quét mã QR bằng ứng dụng ngân hàng (tự động điền sẵn số tiền và nội dung chuyển khoản):
                </p>
                <img src="${qr.qrUrl}" alt="VietQR ${order.MaDon}" style="max-width:230px;border-radius:8px;border:1px solid #e2e8f0;" />
                <div style="margin-top:12px;font-size:13px;color:#1e293b;line-height:1.6;">
                    <div>Ngân hàng: <strong>${qr.bankName}</strong></div>
                    <div>Số tài khoản: <strong>${qr.accountNo}</strong> (${qr.accountName})</div>
                    <div>Số tiền: <strong style="color:#e11d48;">${formatVnd(qr.amount)}</strong></div>
                    <div>Nội dung CK: <strong style="color:#0284c7;">${qr.addInfo}</strong></div>
                </div>
            </div>
        `;
    }

    const statusBadge = STATUS_LABELS[order.TrangThai] || order.TrangThai;

    return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;color:#111827;">
        <div style="background:#111827;color:#ffffff;padding:20px 24px;">
            <h1 style="margin:0;font-size:20px;letter-spacing:0.5px;">SHOPTHOITRANG — HÓA ĐƠN ĐIỆN TỬ</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#d1d5db;">Cảm ơn bạn đã tin tưởng và mua sắm tại cửa hàng!</p>
        </div>

        <div style="padding:24px;">
            <div style="margin-bottom:16px;font-size:14px;line-height:1.6;">
                <div><strong>Mã đơn hàng:</strong> <span style="color:#e11d48;">#${order.MaDon}</span></div>
                <div><strong>Trạng thái hiện tại:</strong> <span style="color:#059669;font-weight:700;">${statusBadge}</span></div>
                <div><strong>Ngày đặt:</strong> ${new Date(order.NgayDat).toLocaleString('vi-VN')}</div>
                <div><strong>Thanh toán:</strong> ${
                    order.PhuongThucThanhToan === 'CHUYEN_KHOAN'
                        ? 'Chuyển khoản ngân hàng (VietQR)'
                        : 'Thanh toán khi nhận hàng (COD)'
                }</div>
            </div>

            <div style="background:#f9fafb;padding:12px 14px;border-radius:8px;font-size:13px;line-height:1.6;margin-bottom:18px;">
                <div><strong>Người nhận:</strong> ${order.HoTenNhan} — ${order.SdtNhan}</div>
                <div><strong>Địa chỉ giao hàng:</strong> ${order.DiaChiNhan}</div>
                ${order.GhiChu ? `<div><strong>Ghi chú:</strong> ${order.GhiChu}</div>` : ''}
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#f3f4f6;text-align:left;">
                        <th style="padding:10px;">Sản phẩm</th>
                        <th style="padding:10px;text-align:center;">SL</th>
                        <th style="padding:10px;text-align:right;">Đơn giá</th>
                        <th style="padding:10px;text-align:right;">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemRows}
                </tbody>
            </table>

            <div style="margin-top:16px;text-align:right;font-size:14px;line-height:1.7;">
                <div>Tạm tính: <strong>${formatVnd(tamTinh)}</strong></div>
                ${
                    soTienGiam > 0
                        ? `<div style="color:#15803d;">Giảm giá${order.MaVoucher ? ` (${order.MaVoucher})` : ''}: <strong>-${formatVnd(soTienGiam)}</strong></div>`
                        : ''
                }
                <div style="font-size:18px;margin-top:4px;">
                    Tổng thanh toán: <strong style="color:#e11d48;">${formatVnd(order.TongTien)}</strong>
                </div>
            </div>

            ${qrBlock}
        </div>

        <div style="background:#f3f4f6;padding:14px 24px;text-align:center;font-size:12px;color:#6b7280;">
            Mọi thắc mắc xin liên hệ Hotline: 0389137130 (8:00 - 21:00) hoặc Email: phanhuy150305@gmail.com
        </div>
    </div>
    `;
};

const emailService = {
    async sendOrderInvoice(order) {
        const recipient = order.EmailNhan || order.EmailTaiKhoan;
        if (!recipient) {
            return { sent: false, reason: 'NO_EMAIL' };
        }

        try {
            const { transporter, fromAddress, isTestMode } = await getTransporter();
            const info = await transporter.sendMail({
                from: fromAddress,
                to: recipient,
                subject: `[ShopThoiTrang] Hóa đơn điện tử đơn hàng #${order.MaDon}`,
                html: buildInvoiceHtml(order)
            });

            const previewUrl = isTestMode ? nodemailer.getTestMessageUrl(info) : null;
            return { sent: true, recipient, isTestMode, previewUrl };
        } catch (err) {
            console.error('[Email Invoice Error]:', err.message);
            return { sent: false, recipient, error: err.message };
        }
    },

    async sendOrderStatusUpdate(order, noteText = '') {
        const recipient = order.EmailNhan || order.EmailTaiKhoan;
        if (!recipient) {
            return { sent: false, reason: 'NO_EMAIL' };
        }

        const statusText = STATUS_LABELS[order.TrangThai] || order.TrangThai;

        try {
            const { transporter, fromAddress } = await getTransporter();
            await transporter.sendMail({
                from: fromAddress,
                to: recipient,
                subject: `[ShopThoiTrang] Đơn hàng #${order.MaDon} — ${statusText}`,
                html: `
                <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;color:#111827;">
                    <div style="background:#111827;color:#ffffff;padding:18px 22px;">
                        <h2 style="margin:0;font-size:18px;">CẬP NHẬT ĐƠN HÀNG #${order.MaDon}</h2>
                    </div>
                    <div style="padding:22px;font-size:14px;line-height:1.6;">
                        <p style="margin-top:0;">Xin chào <strong>${order.HoTenNhan}</strong>,</p>
                        <p>Đơn hàng <strong>#${order.MaDon}</strong> của bạn vừa cập nhật trạng thái:</p>
                        <div style="background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:12px 16px;border-radius:8px;font-weight:700;font-size:15px;margin:12px 0;">
                            ${statusText}
                        </div>
                        ${
                            order.MaVanDon
                                ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:10px 14px;border-radius:8px;font-size:13px;margin:10px 0;">
                                       <div><strong>Đơn vị vận chuyển:</strong> ${order.DonViVanChuyen || 'SPX Express'}</div>
                                       <div><strong>Mã vận đơn:</strong> ${order.MaVanDon}</div>
                                   </div>`
                                : ''
                        }
                        ${noteText ? `<p style="color:#475569;font-size:13px;"><em>Ghi chú: ${noteText}</em></p>` : ''}
                        <div style="background:#f9fafb;padding:12px 14px;border-radius:8px;font-size:13px;margin-top:14px;">
                            <div><strong>Tổng thanh toán:</strong> ${formatVnd(order.TongTien)} (${order.PhuongThucThanhToan})</div>
                            <div><strong>Địa chỉ nhận hàng:</strong> ${order.DiaChiNhan}</div>
                        </div>
                    </div>
                    <div style="background:#f3f4f6;padding:12px 22px;text-align:center;font-size:12px;color:#6b7280;">
                        Hotline hỗ trợ: 0389137130 (8:00 - 21:00) • Email: phanhuy150305@gmail.com
                    </div>
                </div>
                `
            });
            return { sent: true, recipient };
        } catch (err) {
            console.error('[Email Status Update Error]:', err.message);
            return { sent: false, recipient, error: err.message };
        }
    }
};

module.exports = emailService;