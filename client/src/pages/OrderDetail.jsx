import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import orderService from '../services/orderService';
import productService from '../services/productService';
import { formatCurrency } from '../components/ProductCard';
import Loading from '../components/Loading';
import VietQrBox from '../components/VietQrBox';
import OrderTrackingMap from '../components/OrderTrackingMap';

const STEPS = [
    { key: 'CHO_XAC_NHAN', label: '1. Chờ xác nhận' },
    { key: 'DA_XAC_NHAN', label: '2. Đang chuẩn bị hàng' },
    { key: 'DANG_GIAO', label: '3. Đang giao hàng' },
    { key: 'HOAN_THANH', label: '4. Đã nhận & Hoàn thành' }
];

const REFUND_REASONS = [
    'Sản phẩm bị lỗi, rách hoặc hư hỏng do sản xuất / vận chuyển',
    'Giao sai kích cỡ (Size) hoặc sai màu sắc so với đơn đặt',
    'Thiếu số lượng sản phẩm so với hóa đơn',
    'Sản phẩm không đúng với hình ảnh và mô tả trên cửa hàng'
];

const OrderDetail = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Form đánh giá sản phẩm ngay trong đơn hàng
    const [reviewItem, setReviewItem] = useState(null);
    const [soSao, setSoSao] = useState(5);
    const [nhanXet, setNhanXet] = useState('');
    const [reviewBusy, setReviewBusy] = useState(false);

    // Form yêu cầu trả hàng / hoàn tiền
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundPreset, setRefundPreset] = useState(REFUND_REASONS[0]);
    const [refundNote, setRefundNote] = useState('');
    const [refundBusy, setRefundBusy] = useState(false);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const res = await orderService.getOrderById(id);
            setOrder(res.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();
    }, [id]);

    const handleCancel = async () => {
        if (!window.confirm('Xác nhận hủy đơn hàng này?')) return;
        try {
            await orderService.cancelOrder(id);
            setNotice('Đã hủy đơn hàng thành công.');
            loadOrder();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleConfirmReceived = async () => {
        if (!window.confirm('Bạn đã kiểm tra hàng và xác nhận nhận được đầy đủ sản phẩm?')) return;
        try {
            const res = await orderService.confirmReceived(id);
            setNotice(res.message || 'Cảm ơn bạn đã xác nhận nhận hàng!');
            loadOrder();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleOpenReview = (item) => {
        setReviewItem(item);
        setSoSao(5);
        setNhanXet('');
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewItem) return;
        setReviewBusy(true);
        try {
            await productService.createReview({
                sanPhamId: reviewItem.SanPhamId,
                soSao,
                nhanXet
            });
            setNotice(`Đã gửi đánh giá ${soSao} sao cho "${reviewItem.TenSanPham}". Cảm ơn bạn!`);
            setReviewItem(null);
            setNhanXet('');
        } catch (err) {
            alert(err.message);
        } finally {
            setReviewBusy(false);
        }
    };

    const handleSubmitRefund = async (e) => {
        e.preventDefault();
        const fullReason = refundNote.trim()
            ? `${refundPreset} — Chi tiết: ${refundNote.trim()}`
            : refundPreset;

        setRefundBusy(true);
        try {
            const res = await orderService.requestRefund(id, fullReason);
            setNotice(res.message);
            setShowRefundForm(false);
            setRefundNote('');
            loadOrder();
        } catch (err) {
            alert(err.message);
        } finally {
            setRefundBusy(false);
        }
    };

    if (loading) return <Loading />;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!order) return null;

    const effectiveStepKey = ['YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai)
        ? 'HOAN_THANH'
        : order.TrangThai;
    const currentStepIndex = STEPS.findIndex((s) => s.key === effectiveStepKey);

    const soTienGiam = Number(order.SoTienGiam || 0);
    const tamTinh =
        (order.chiTiet || []).reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0) ||
        Number(order.TongTien || 0) + soTienGiam;

    // Xây dựng lịch sử hành trình đơn hàng
    const timelineEvents = [
        {
            time: order.NgayDat,
            title: 'Đặt hàng thành công',
            desc: `Đơn hàng #${order.MaDon} đã được tạo (${order.PhuongThucThanhToan === 'CHUYEN_KHOAN' ? 'Chuyển khoản VietQR' : 'Thanh toán COD'}).`,
            active: true
        }
    ];

    if (['DA_XAC_NHAN', 'DANG_GIAO', 'HOAN_THANH', 'YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai)) {
        timelineEvents.push({
            time: order.HanChuanBi ? new Date(new Date(order.HanChuanBi).getTime() - 48 * 3600 * 1000) : order.NgayDat,
            title: 'Người bán đã xác nhận & đang chuẩn bị hàng',
            desc: 'Cửa hàng đang kiểm tra chất lượng, đóng gói sản phẩm và in phiếu vận đơn.',
            active: true
        });
    }

    if (['DANG_GIAO', 'HOAN_THANH', 'YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai)) {
        timelineEvents.push({
            time: order.NgayBanGiao || order.NgayCapNhat,
            title: `Đã bàn giao cho đơn vị vận chuyển ${order.DonViVanChuyen || 'SPX Express'}`,
            desc: `Mã vận đơn: ${order.MaVanDon || order.MaDon}. Kiện hàng đang trung chuyển và giao tới ${order.DiaChiNhan}.`,
            active: true
        });
    }

    if (['HOAN_THANH', 'YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai)) {
        timelineEvents.push({
            time: order.NgayHoanThanh || order.NgayCapNhat,
            title: 'Giao hàng thành công — Đã nhận được hàng',
            desc: 'Đơn hàng đã giao tới người nhận thành công.',
            active: true
        });
    }

    if (order.TrangThai === 'YEU_CAU_HOAN_TIEN') {
        timelineEvents.push({
            time: order.NgayCapNhat,
            title: 'Đang yêu cầu Trả hàng / Hoàn tiền',
            desc: `Lý do: ${order.LyDoHoanTien || 'Đang chờ shop xác nhận'}`,
            active: true
        });
    }

    if (order.TrangThai === 'DA_HOAN_TIEN') {
        timelineEvents.push({
            time: order.NgayCapNhat,
            title: 'Đã chấp nhận Trả hàng / Hoàn tiền',
            desc: order.PhanHoiHoanTien || 'Cửa hàng đã xác nhận hoàn tiền cho đơn hàng.',
            active: true
        });
    }

    if (order.TrangThai === 'DA_HUY') {
        timelineEvents.push({
            time: order.NgayCapNhat,
            title: 'Đơn hàng đã bị hủy',
            desc: 'Đơn hàng đã hủy và hoàn lại số lượng tồn kho.',
            active: true
        });
    }

    return (
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <div style={{ marginBottom: '14px' }}>
                <Link to="/my-orders" className="btn btn-outline btn-sm">
                    &larr; Quay lại danh sách đơn
                </Link>
            </div>

            {notice && <div className="alert alert-success">{notice}</div>}

            <div className="card">
                <div className="section-header">
                    <div>
                        <h1 style={{ fontSize: '22px' }}>Chi tiết đơn hàng #{order.MaDon}</h1>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Đặt lúc: {new Date(order.NgayDat).toLocaleString('vi-VN')}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {order.TrangThai === 'DANG_GIAO' && (
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirmReceived}>
                                ✓ Đã nhận được hàng
                            </button>
                        )}
                        {order.TrangThai === 'HOAN_THANH' && (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowRefundForm((v) => !v)}
                            >
                                ↩ Yêu cầu Trả hàng / Hoàn tiền
                            </button>
                        )}
                        {order.TrangThai === 'CHO_XAC_NHAN' && (
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleCancel}>
                                Hủy đơn hàng
                            </button>
                        )}
                    </div>
                </div>

                {/* Nhắc nhở quay video mở hộp khi đơn đang giao */}
                {order.TrangThai === 'DANG_GIAO' && (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                        📦 <strong>Lưu ý khi nhận hàng:</strong> Bạn vui lòng kiểm tra ngoại quan gói hàng và quay video mở hộp để được hỗ trợ đổi trả / hoàn tiền nhanh nhất nếu có phát sinh. Sau khi nhận đủ hàng, hãy bấm <strong>"Đã nhận được hàng"</strong> để mở khóa đánh giá sản phẩm.
                    </div>
                )}

                {order.TrangThai === 'YEU_CAU_HOAN_TIEN' && (
                    <div className="alert alert-warning" style={{ background: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
                        <strong>Đang xử lý yêu cầu Trả hàng / Hoàn tiền:</strong> {order.LyDoHoanTien}
                    </div>
                )}

                {order.TrangThai === 'DA_HOAN_TIEN' && (
                    <div className="alert alert-success">
                        <strong>Đơn hàng đã được hoàn tiền.</strong> {order.PhanHoiHoanTien ? `Phản hồi từ shop: ${order.PhanHoiHoanTien}` : ''}
                    </div>
                )}

                {/* Form yêu cầu trả hàng / hoàn tiền */}
                {showRefundForm && order.TrangThai === 'HOAN_THANH' && (
                    <form
                        onSubmit={handleSubmitRefund}
                        style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}
                    >
                        <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#92400e', marginBottom: '8px' }}>
                            Gửi yêu cầu Trả hàng / Hoàn tiền
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px' }}>Chọn lý do</label>
                            <select className="form-control" value={refundPreset} onChange={(e) => setRefundPreset(e.target.value)}>
                                {REFUND_REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '13px' }}>Mô tả chi tiết tình trạng hàng (kèm thông tin video mở hộp nếu có)</label>
                            <textarea
                                rows="2"
                                className="form-control"
                                placeholder="Ví dụ: Áo size L bị bung chỉ ở tay trái, mình đã quay video mở hộp..."
                                value={refundNote}
                                onChange={(e) => setRefundNote(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={refundBusy}>
                                {refundBusy ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
                            </button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowRefundForm(false)}>
                                Đóng
                            </button>
                        </div>
                    </form>
                )}

                {order.TrangThai === 'DA_HUY' ? (
                    <div className="alert alert-error">Đơn hàng này đã bị hủy.</div>
                ) : (
                    <div className="order-steps">
                        {STEPS.map((step, idx) => (
                            <div
                                key={step.key}
                                className={`order-step ${idx <= currentStepIndex ? 'done' : ''}`}
                            >
                                {step.label}
                            </div>
                        ))}
                    </div>
                )}

                <OrderTrackingMap order={order} />

                {/* Thông tin vận chuyển & Timeline hành trình */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>🚚 Hành trình vận chuyển & Đơn hàng</strong>
                        {order.MaVanDon && (
                            <span style={{ fontSize: '13px', background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                                {order.DonViVanChuyen} • Mã vận đơn: {order.MaVanDon}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '2px solid #cbd5e1', paddingLeft: '14px', marginLeft: '6px' }}>
                        {timelineEvents.slice().reverse().map((ev, idx) => (
                            <div key={idx} style={{ position: 'relative' }}>
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: '-20px',
                                        top: '4px',
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: idx === 0 ? '#10b981' : '#94a3b8'
                                    }}
                                />
                                <div style={{ fontSize: '13.5px', fontWeight: idx === 0 ? 700 : 600, color: idx === 0 ? '#065f46' : '#1e293b' }}>
                                    {ev.title}
                                </div>
                                <div style={{ fontSize: '12.5px', color: '#475569' }}>{ev.desc}</div>
                                {ev.time && (
                                    <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                        {new Date(ev.time).toLocaleString('vi-VN')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ fontSize: '14px', marginBottom: '20px', display: 'grid', gap: '6px' }}>
                    <div><strong>Người nhận:</strong> {order.HoTenNhan} ({order.SdtNhan})</div>
                    {(order.EmailNhan || order.EmailTaiKhoan) && (
                        <div><strong>Email nhận hóa đơn:</strong> {order.EmailNhan || order.EmailTaiKhoan}</div>
                    )}
                    <div><strong>Địa chỉ giao hàng:</strong> {order.DiaChiNhan}</div>
                    <div><strong>Phương thức thanh toán:</strong> {order.PhuongThucThanhToan}</div>
                    {order.GhiChu && <div><strong>Ghi chú:</strong> {order.GhiChu}</div>}
                </div>

                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Phân loại</th>
                                <th>SL</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                                {order.TrangThai === 'HOAN_THANH' && <th>Đánh giá</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {(order.chiTiet || []).map((item) => (
                                <tr key={item.ChiTietId}>
                                    <td>
                                        <Link to={`/products/${item.SanPhamId}`} style={{ fontWeight: 600 }}>
                                            {item.TenSanPham}
                                        </Link>
                                    </td>
                                    <td>{item.Size} - {item.Mau}</td>
                                    <td>{item.SoLuong}</td>
                                    <td>{formatCurrency(item.DonGia)}</td>
                                    <td><strong>{formatCurrency(item.ThanhTien)}</strong></td>
                                    {order.TrangThai === 'HOAN_THANH' && (
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleOpenReview(item)}
                                            >
                                                ★ Đánh giá
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Form đánh giá sản phẩm trực tiếp */}
                {reviewItem && (
                    <form
                        onSubmit={handleSubmitReview}
                        style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #86efac', padding: '16px', borderRadius: '10px' }}
                    >
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#166534', marginBottom: '10px' }}>
                            ★ Đánh giá sản phẩm: {reviewItem.TenSanPham} ({reviewItem.Size} - {reviewItem.Mau})
                        </div>
                        <div className="form-group">
                            <label className="form-label">Chất lượng sản phẩm</label>
                            <select
                                className="form-control"
                                style={{ maxWidth: '260px' }}
                                value={soSao}
                                onChange={(e) => setSoSao(Number(e.target.value))}
                            >
                                <option value={5}>★★★★★ (5 sao - Tuyệt vời)</option>
                                <option value={4}>★★★★☆ (4 sao - Hài lòng)</option>
                                <option value={3}>★★★☆☆ (3 sao - Bình thường)</option>
                                <option value={2}>★★☆☆☆ (2 sao - Không hài lòng)</option>
                                <option value={1}>★☆☆☆☆ (1 sao - Tệ)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nhận xét của bạn</label>
                            <textarea
                                rows="3"
                                className="form-control"
                                placeholder="Chia sẻ cảm nhận thực tế về chất vải, form dáng, giao hàng..."
                                value={nhanXet}
                                onChange={(e) => setNhanXet(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={reviewBusy}>
                                {reviewBusy ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setReviewItem(null)}>
                                Hủy
                            </button>
                        </div>
                    </form>
                )}

                <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    {(soTienGiam > 0 || order.MaVoucher) && (
                        <>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                Tạm tính: <strong>{formatCurrency(tamTinh)}</strong>
                            </div>
                            <div style={{ fontSize: '14px', color: '#15803d' }}>
                                Giảm giá{order.MaVoucher ? ` (${order.MaVoucher})` : ''}:{' '}
                                <strong>-{formatCurrency(soTienGiam)}</strong>
                            </div>
                        </>
                    )}
                    <div style={{ fontSize: '19px' }}>
                        Tổng cộng: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(order.TongTien)}</strong>
                    </div>
                </div>

                {order.vietQr && order.TrangThai === 'CHO_XAC_NHAN' && (
                    <VietQrBox vietQr={order.vietQr} onPaymentConfirmed={(updated, msgText) => { setOrder(updated); setNotice(msgText || 'Đã nhận thanh toán chuyển khoản!'); }} />
                )}
            </div>
        </div>
    );
};

export default OrderDetail;