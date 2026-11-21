import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import voucherService from '../services/voucherService';
import { formatCurrency } from '../components/ProductCard';
import VietQrBox from '../components/VietQrBox';

const Checkout = () => {
    const { cartItems, totalAmount, clearCart } = useCart();
    const { user, isAuthenticated } = useAuth();

    const [hoTenNhan, setHoTenNhan] = useState(user?.HoTen || '');
    const [sdtNhan, setSdtNhan] = useState(user?.SoDienThoai || '');
    const [emailNhan, setEmailNhan] = useState(user?.Email || '');
    const [diaChiNhan, setDiaChiNhan] = useState('');
    const [ghiChu, setGhiChu] = useState('');
    const [phuongThucThanhToan, setPhuongThucThanhToan] = useState('COD');

    // Mã giảm giá
    const [publicVouchers, setPublicVouchers] = useState([]);
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedVoucher, setAppliedVoucher] = useState(null);
    const [voucherMsg, setVoucherMsg] = useState({ type: '', text: '' });
    const [ineligibleInfo, setIneligibleInfo] = useState(null);
    const [applyingVoucher, setApplyingVoucher] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [createdOrder, setCreatedOrder] = useState(null);

    useEffect(() => {
        voucherService
            .getPublicVouchers()
            .then((res) => setPublicVouchers(res.data || []))
            .catch(() => {});
    }, []);

    if (cartItems.length === 0 && !createdOrder) {
        return <Navigate to="/cart" replace />;
    }

    const discountAmount = appliedVoucher ? Number(appliedVoucher.soTienGiam) || 0 : 0;
    const finalTotal = Math.max(0, totalAmount - discountAmount);

    const buildIneligibleDetail = (voucher, customReason = null) => {
        const minOrder = Number(voucher.DonToiThieu) || 0;
        const missingAmount = Math.max(0, minOrder - totalAmount);
        const reason =
            customReason ||
            `Đơn hàng hiện tại (${formatCurrency(totalAmount)}) chưa đạt mức tối thiểu — bạn cần mua thêm ${formatCurrency(missingAmount)} để dùng mã này.`;

        return {
            voucher,
            reason
        };
    };

    const handleApplyCode = async (codeToApply) => {
        const code = (codeToApply ?? voucherInput).trim().toUpperCase();
        if (!code) {
            setIneligibleInfo(null);
            setVoucherMsg({ type: 'error', text: 'Vui lòng nhập hoặc chọn một mã giảm giá.' });
            return;
        }

        const matchedPublic = publicVouchers.find((v) => v.MaCode === code);

        if (matchedPublic && totalAmount < Number(matchedPublic.DonToiThieu)) {
            setVoucherInput(code);
            setAppliedVoucher(null);
            setVoucherMsg({ type: '', text: '' });
            setIneligibleInfo(buildIneligibleDetail(matchedPublic));
            return;
        }

        setApplyingVoucher(true);
        setVoucherMsg({ type: '', text: '' });
        setIneligibleInfo(null);
        try {
            const res = await voucherService.applyVoucher(code, totalAmount);
            setVoucherInput(res.data.maCode);
            setAppliedVoucher(res.data);
            setVoucherMsg({ type: 'success', text: res.message });
        } catch (err) {
            setAppliedVoucher(null);
            if (matchedPublic) {
                setIneligibleInfo(buildIneligibleDetail(matchedPublic, err.message));
            } else {
                setVoucherMsg({ type: 'error', text: err.message });
            }
        } finally {
            setApplyingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        setAppliedVoucher(null);
        setVoucherInput('');
        setVoucherMsg({ type: '', text: '' });
        setIneligibleInfo(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const payload = {
                hoTenNhan,
                sdtNhan,
                emailNhan,
                diaChiNhan,
                ghiChu,
                phuongThucThanhToan,
                maVoucher: appliedVoucher ? appliedVoucher.maCode : null,
                items: cartItems.map((item) => ({
                    bienTheId: item.bienTheId,
                    soLuong: item.soLuong
                }))
            };
            const res = await orderService.placeOrder(payload);
            setCreatedOrder(res.data);
            clearCart();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (createdOrder) {
        const emailInfo = createdOrder.emailInvoice;
        return (
            <div className="card" style={{ maxWidth: '680px', margin: '16px auto', textAlign: 'center', padding: '32px 24px' }}>
                <span className="badge badge-success" style={{ marginBottom: '12px' }}>
                    ĐẶT HÀNG THÀNH CÔNG
                </span>
                <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Cảm ơn bạn đã đặt hàng!</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Mã đơn hàng của bạn là <strong style={{ color: 'var(--accent)', fontSize: '18px' }}>{createdOrder.MaDon}</strong>.
                    Vui lòng lưu lại mã đơn và số điện thoại <strong>{createdOrder.SdtNhan}</strong> để tra cứu tình trạng giao hàng.
                </p>

                {emailInfo?.sent && (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#166534',
                            fontSize: '13px',
                            marginBottom: '14px'
                        }}
                    >
                        Hóa đơn điện tử đã được gửi tới email <strong>{emailInfo.recipient}</strong>.
                        {emailInfo.previewUrl && (
                            <div style={{ marginTop: '4px' }}>
                                <a
                                    href={emailInfo.previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}
                                >
                                    Xem trước email hóa đơn (Chế độ kiểm thử) &rarr;
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {createdOrder.vietQr && <VietQrBox vietQr={createdOrder.vietQr} />}

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '22px' }}>
                    {isAuthenticated ? (
                        <Link to={`/orders/${createdOrder.DonHangId}`} className="btn btn-primary">
                            Xem chi tiết đơn hàng
                        </Link>
                    ) : (
                        <Link to="/tra-cuu-don" className="btn btn-primary">
                            Tra cứu đơn hàng
                        </Link>
                    )}
                    <Link to="/products" className="btn btn-outline">
                        Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="section-title" style={{ marginBottom: '20px' }}>
                Thanh toán & Giao hàng
            </h1>

            {error && <div className="alert alert-error">{error}</div>}

            <form className="checkout-grid" onSubmit={handleSubmit}>
                <div className="card">
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Thông tin người nhận</h3>

                    <div className="form-group">
                        <label className="form-label">Họ và tên người nhận *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            value={hoTenNhan}
                            onChange={(e) => setHoTenNhan(e.target.value)}
                            placeholder="Nguyễn Văn A"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Số điện thoại nhận hàng *</label>
                        <input
                            type="tel"
                            required
                            className="form-control"
                            value={sdtNhan}
                            onChange={(e) => setSdtNhan(e.target.value)}
                            placeholder="0909123456"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email nhận hóa đơn điện tử</label>
                        <input
                            type="email"
                            className="form-control"
                            value={emailNhan}
                            onChange={(e) => setEmailNhan(e.target.value)}
                            placeholder="email@example.com (Hệ thống sẽ gửi hóa đơn vào email này)"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Địa chỉ giao hàng chi tiết *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            value={diaChiNhan}
                            onChange={(e) => setDiaChiNhan(e.target.value)}
                            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Phương thức thanh toán</label>
                        <select
                            className="form-control"
                            value={phuongThucThanhToan}
                            onChange={(e) => setPhuongThucThanhToan(e.target.value)}
                        >
                            <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                            <option value="CHUYEN_KHOAN">Chuyển khoản ngân hàng (Mã VietQR động)</option>
                        </select>
                        {phuongThucThanhToan === 'CHUYEN_KHOAN' && (
                            <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '6px' }}>
                                Hệ thống sẽ tự động tạo mã VietQR điền sẵn số tiền sau giảm giá và mã đơn hàng ngay sau khi bạn bấm đặt hàng.
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Ghi chú đơn hàng (tùy chọn)</label>
                        <textarea
                            rows="2"
                            className="form-control"
                            value={ghiChu}
                            onChange={(e) => setGhiChu(e.target.value)}
                            placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                        />
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Sản phẩm đặt mua</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                        {cartItems.map((item) => (
                            <div
                                key={item.bienTheId}
                                style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14px' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600 }}>{item.tenSanPham}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                        {item.size} - {item.mau} &times; {item.soLuong}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 600 }}>{formatCurrency(item.gia * item.soLuong)}</div>
                            </div>
                        ))}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />

                    {/* Khu vực nhập & chọn nhanh mã giảm giá */}
                    <div style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ marginBottom: '6px' }}>
                            Mã giảm giá (Voucher)
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nhập mã (VD: CHAO2026)"
                                value={voucherInput}
                                disabled={Boolean(appliedVoucher)}
                                onChange={(e) => {
                                    setVoucherInput(e.target.value.toUpperCase());
                                    if (ineligibleInfo) setIneligibleInfo(null);
                                }}
                            />
                            {appliedVoucher ? (
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleRemoveVoucher}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    Gỡ mã
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={applyingVoucher}
                                    onClick={() => handleApplyCode()}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    {applyingVoucher ? 'Đang kiểm tra...' : 'Áp dụng'}
                                </button>
                            )}
                        </div>

                        {voucherMsg.text && (
                            <div
                                style={{
                                    marginTop: '6px',
                                    fontSize: '13px',
                                    color: voucherMsg.type === 'success' ? '#15803d' : '#dc2626'
                                }}
                            >
                                {voucherMsg.text}
                            </div>
                        )}

                        {ineligibleInfo && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#991b1b',
                                    fontSize: '13px',
                                    lineHeight: 1.5
                                }}
                            >
                                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                                    Không đủ điều kiện dùng voucher {ineligibleInfo.voucher.MaCode}
                                </div>
                                <div style={{ marginBottom: '8px' }}>{ineligibleInfo.reason}</div>
                                <div
                                    style={{
                                        paddingTop: '6px',
                                        borderTop: '1px dashed #fca5a5',
                                        color: '#7f1d1d',
                                        fontSize: '12px'
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                        Điều kiện áp dụng của mã {ineligibleInfo.voucher.MaCode}:
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                        <li>
                                            Ưu đãi:{' '}
                                            {ineligibleInfo.voucher.LoaiGiam === 'TIEN'
                                                ? `Giảm trực tiếp ${formatCurrency(ineligibleInfo.voucher.GiaTriGiam)}`
                                                : `Giảm ${ineligibleInfo.voucher.GiaTriGiam}%${
                                                      Number(ineligibleInfo.voucher.GiamToiDa) > 0
                                                          ? ` (tối đa ${formatCurrency(ineligibleInfo.voucher.GiamToiDa)})`
                                                          : ''
                                                  }`}
                                        </li>
                                        <li>
                                            Giá trị đơn hàng tối thiểu:{' '}
                                            <strong>{formatCurrency(ineligibleInfo.voucher.DonToiThieu)}</strong>
                                        </li>
                                        <li>
                                            Giới hạn: Mỗi tài khoản dùng tối đa 1 lần (còn{' '}
                                            {ineligibleInfo.voucher.ConLai} lượt)
                                        </li>
                                        <li>
                                            Hạn sử dụng: Đến hết ngày{' '}
                                            {new Date(ineligibleInfo.voucher.NgayKetThuc).toLocaleDateString('vi-VN')}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {publicVouchers.length > 0 && !appliedVoucher && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    Mã ưu đãi hiện có (bấm để chọn hoặc xem điều kiện):
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {publicVouchers.map((v) => {
                                        const eligible = totalAmount >= Number(v.DonToiThieu);
                                        return (
                                            <button
                                                key={v.VoucherId}
                                                type="button"
                                                disabled={applyingVoucher}
                                                onClick={() => handleApplyCode(v.MaCode)}
                                                title={v.MoTa || v.MaCode}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: '6px',
                                                    border: eligible
                                                        ? '1px dashed var(--accent)'
                                                        : '1px dashed #cbd5e1',
                                                    background: eligible ? '#fff1f2' : '#f8fafc',
                                                    color: eligible ? 'var(--accent)' : '#64748b',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {v.MaCode} (
                                                {v.LoaiGiam === 'TIEN'
                                                    ? `-${formatCurrency(v.GiaTriGiam)}`
                                                    : `-${v.GiaTriGiam}%`}
                                                )
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tạm tính:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>

                    {appliedVoucher && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '14px',
                                color: '#15803d',
                                marginBottom: '8px'
                            }}
                        >
                            <span>Giảm giá ({appliedVoucher.maCode}):</span>
                            <strong>-{formatCurrency(discountAmount)}</strong>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', marginBottom: '20px' }}>
                        <strong>Tổng thanh toán:</strong>
                        <strong style={{ color: 'var(--accent)' }}>{formatCurrency(finalTotal)}</strong>
                    </div>

                    <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={submitting}>
                        {submitting ? 'Đang xử lý đơn hàng...' : 'Xác nhận đặt hàng'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Checkout;