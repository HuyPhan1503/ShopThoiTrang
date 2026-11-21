import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../components/ProductCard';
import Loading from '../../components/Loading';
import OrderTrackingMap from '../../components/OrderTrackingMap';

const CARRIERS = [
    { name: 'SPX Express', prefix: 'SPX' },
    { name: 'Giao Hàng Nhanh (GHN)', prefix: 'GHN' },
    { name: 'Giao Hàng Tiết Kiệm (GHTK)', prefix: 'GHTK' },
    { name: 'Viettel Post', prefix: 'VTP' },
    { name: 'J&T Express', prefix: 'JT' }
];

const STATUS_OPTIONS = [
    { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
    { value: 'DA_XAC_NHAN', label: 'Đã xác nhận (Chuẩn bị hàng)' },
    { value: 'DANG_GIAO', label: 'Đang giao hàng (Đã bàn giao ĐVVC)' },
    { value: 'HOAN_THANH', label: 'Hoàn thành' },
    { value: 'DA_HUY', label: 'Đã hủy (Tự động hoàn tồn kho)' }
];

const AdminOrderDetail = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    // Chuẩn bị hàng & ĐVVC
    const [carrier, setCarrier] = useState('SPX Express');
    const [waybill, setWaybill] = useState('');

    // Xử lý yêu cầu hoàn tiền
    const [refundReply, setRefundReply] = useState('');

    const makeDefaultWaybill = (carrierName, maDon) => {
        const found = CARRIERS.find((c) => c.name === carrierName);
        const prefix = found ? found.prefix : 'SPX';
        return `${prefix}${maDon}${Math.floor(100 + Math.random() * 900)}`;
    };

    const loadOrder = async () => {
        setLoading(true);
        try {
            const res = await orderService.getOrderById(id);
            const data = res.data;
            setOrder(data);
            setSelectedStatus(data.TrangThai);
            const initCarrier = data.DonViVanChuyen || 'SPX Express';
            setCarrier(initCarrier);
            setWaybill(data.MaVanDon || makeDefaultWaybill(initCarrier, data.MaDon));
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();
    }, [id]);

    const handleCarrierChange = (nextCarrier) => {
        setCarrier(nextCarrier);
        if (order && !order.MaVanDon) {
            setWaybill(makeDefaultWaybill(nextCarrier, order.MaDon));
        }
    };

    const handleShipOrder = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await orderService.shipOrder(id, {
                donViVanChuyen: carrier,
                maVanDon: waybill.trim()
            });
            setOrder(res.data);
            setSelectedStatus(res.data.TrangThai);
            setMsg({ type: 'success', text: res.message || 'Đã đóng gói và bàn giao cho đơn vị vận chuyển!' });
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (selectedStatus === order.TrangThai) return;
        if (
            selectedStatus === 'DA_HUY' &&
            !window.confirm('Hủy đơn hàng này sẽ hoàn lại toàn bộ số lượng tồn kho. Tiếp tục?')
        ) {
            return;
        }

        setUpdating(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await orderService.updateOrderStatus(id, selectedStatus);
            setOrder(res.data);
            setSelectedStatus(res.data.TrangThai);
            setMsg({ type: 'success', text: 'Cập nhật trạng thái đơn hàng thành công!' });
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
        }
    };

    const handleProcessRefund = async (action) => {
        const confirmText =
            action === 'APPROVE'
                ? 'Xác nhận CHẤP NHẬN hoàn tiền và cộng trả tồn kho cho đơn hàng này?'
                : 'Xác nhận TỪ CHỐI yêu cầu hoàn tiền của khách hàng?';
        if (!window.confirm(confirmText)) return;

        setUpdating(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await orderService.processRefund(id, {
                action,
                phanHoiHoanTien: refundReply
            });
            setOrder(res.data);
            setSelectedStatus(res.data.TrangThai);
            setMsg({ type: 'success', text: res.message });
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setUpdating(false);
        }
    };

    const handlePrintPackingSlip = () => {
        if (!order) return;
        const codAmount = order.PhuongThucThanhToan === 'CHUYEN_KHOAN' ? 0 : Number(order.TongTien || 0);
        const displayCarrier = order.DonViVanChuyen || carrier || 'SPX Express';
        const displayWaybill = order.MaVanDon || waybill || order.MaDon;

        const rowsHtml = (order.chiTiet || [])
            .map(
                (item, i) => `
                <tr>
                    <td style="border:1px solid #111;padding:6px;text-align:center;">${i + 1}</td>
                    <td style="border:1px solid #111;padding:6px;">${item.TenSanPham} (${item.Size} - ${item.Mau})</td>
                    <td style="border:1px solid #111;padding:6px;text-align:center;">${item.SoLuong}</td>
                </tr>`
            )
            .join('');

        const win = window.open('', '_blank', 'width=740,height=840');
        if (!win) return;
        win.document.write(`
            <html>
            <head><title>Phiếu vận đơn #${displayWaybill}</title></head>
            <body style="font-family:Arial,sans-serif;padding:24px;color:#111;">
                <div style="border:2px solid #111;padding:18px;max-width:600px;margin:0 auto;">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:10px;">
                        <div>
                            <strong style="font-size:20px;">SHOPTHOITRANG</strong><br/>
                            <span style="font-size:12px;">ĐVVC: <strong>${displayCarrier}</strong></span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:11px;letter-spacing:1px;">MÃ VẬN ĐƠN</div>
                            <strong style="font-size:19px;">${displayWaybill}</strong><br/>
                            <span style="font-size:12px;">Mã đơn: #${order.MaDon}</span>
                        </div>
                    </div>

                    <div style="margin:10px 0;padding:8px;background:#f3f4f6;text-align:center;font-family:monospace;letter-spacing:3px;font-weight:bold;font-size:15px;border:1px solid #cbd5e1;">
                        |||| ||| || |||| ||| |||| ${displayWaybill} |||| |||
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:10px 0;border-bottom:1px dashed #333;font-size:13px;line-height:1.5;">
                        <div>
                            <div style="font-weight:bold;text-transform:uppercase;font-size:11px;color:#555;">Từ (Người gửi):</div>
                            <strong>ShopThoiTrang</strong><br/>
                            Biên Hòa, Đồng Nai<br/>
                            SĐT: 0389137130
                        </div>
                        <div>
                            <div style="font-weight:bold;text-transform:uppercase;font-size:11px;color:#555;">Đến (Người nhận):</div>
                            <strong>${order.HoTenNhan}</strong> — <strong>${order.SdtNhan}</strong><br/>
                            ${order.DiaChiNhan}
                        </div>
                    </div>

                    ${order.GhiChu ? `<div style="padding:8px 0;font-size:12.5px;border-bottom:1px dashed #333;"><strong>Ghi chú giao hàng:</strong> ${order.GhiChu}</div>` : ''}

                    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">
                        <thead>
                            <tr style="background:#f3f4f6;">
                                <th style="border:1px solid #111;padding:6px;width:40px;">STT</th>
                                <th style="border:1px solid #111;padding:6px;text-align:left;">Nội dung hàng hóa (Cho kiểm tra hàng)</th>
                                <th style="border:1px solid #111;padding:6px;width:55px;">SL</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>

                    <div style="margin-top:16px;padding:12px;background:#f8fafc;border:2px solid #111;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:12px;">Tiền thu hộ người nhận (COD):</div>
                            <div style="font-size:11px;color:#555;">(${order.PhuongThucThanhToan === 'CHUYEN_KHOAN' ? 'Khách đã thanh toán chuyển khoản' : 'Thu tiền mặt khi giao hàng'})</div>
                        </div>
                        <strong style="font-size:22px;">${codAmount.toLocaleString('vi-VN')} đ</strong>
                    </div>
                </div>
                <script>window.onload = function() { window.print(); };</script>
            </body>
            </html>
        `);
        win.document.close();
    };

    if (loading) return <Loading />;
    if (!order) return <div className="alert alert-error">{msg.text || 'Không tìm thấy đơn hàng.'}</div>;

    const soTienGiam = Number(order.SoTienGiam || 0);
    const tamTinh =
        (order.chiTiet || []).reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0) ||
        Number(order.TongTien || 0) + soTienGiam;

    const isTerminal = ['HOAN_THANH', 'DA_HUY', 'YEU_CAU_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(order.TrangThai);

    return (
        <div style={{ maxWidth: '920px' }}>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <Link to="/admin/orders" className="btn btn-outline btn-sm">
                    &larr; Quay lại danh sách đơn hàng
                </Link>
                <button type="button" className="btn btn-outline btn-sm" onClick={handlePrintPackingSlip}>
                    🖨️ In phiếu vận đơn (Dán gói hàng)
                </button>
            </div>

            {msg.text && (
                <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {msg.text}
                </div>
            )}

            {/* Giai đoạn 2: Hộp Chuẩn bị hàng & Bàn giao ĐVVC */}
            {(order.TrangThai === 'CHO_XAC_NHAN' || order.TrangThai === 'DA_XAC_NHAN') && (
                <div className="card" style={{ marginBottom: '18px', background: '#eff6ff', border: '1px solid #93c5fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e3a8a' }}>
                                📦 Giai đoạn 2: Chuẩn bị hàng, In phiếu gửi & Bàn giao ĐVVC
                            </div>
                            {order.HanChuanBi && (
                                <div style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
                                    ⏳ Hạn chuẩn bị hàng & bàn giao (48h): {new Date(order.HanChuanBi).toLocaleString('vi-VN')}
                                </div>
                            )}
                        </div>
                        <button type="button" className="btn btn-outline btn-sm" onClick={handlePrintPackingSlip}>
                            🖨️ In phiếu gửi hàng ngay
                        </button>
                    </div>

                    <form onSubmit={handleShipOrder} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 210px' }}>
                            <label className="form-label" style={{ fontSize: '12.5px' }}>Đơn vị vận chuyển (ĐVVC)</label>
                            <select className="form-control" value={carrier} onChange={(e) => handleCarrierChange(e.target.value)}>
                                {CARRIERS.map((c) => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ flex: '1 1 210px' }}>
                            <label className="form-label" style={{ fontSize: '12.5px' }}>Mã vận đơn</label>
                            <input
                                type="text"
                                className="form-control"
                                value={waybill}
                                onChange={(e) => setWaybill(e.target.value.toUpperCase())}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={updating}>
                            {updating ? 'Đang xử lý...' : '🚚 Xác nhận đóng gói & Bàn giao ĐVVC'}
                        </button>
                    </form>
                </div>
            )}

            {/* Giai đoạn 3: Hộp Xử lý Yêu cầu Trả hàng / Hoàn tiền */}
            {order.TrangThai === 'YEU_CAU_HOAN_TIEN' && (
                <div className="card" style={{ marginBottom: '18px', background: '#fffbeb', border: '1px solid #f59e0b' }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#92400e', marginBottom: '6px' }}>
                        ⚠️ Khách hàng đang yêu cầu Trả hàng / Hoàn tiền
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#78350f', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fde68a', marginBottom: '10px' }}>
                        <strong>Lý do khách gửi:</strong> {order.LyDoHoanTien || 'Không có mô tả chi tiết'}
                    </div>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Nhập phản hồi của shop gửi tới khách hàng (tùy chọn)..."
                            value={refundReply}
                            onChange={(e) => setRefundReply(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleProcessRefund('APPROVE')}
                            style={{ border: 'none', borderRadius: '6px', background: '#059669', color: '#fff', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            ✓ Chấp nhận hoàn tiền & Hoàn tồn kho
                        </button>
                        <button
                            type="button"
                            disabled={updating}
                            onClick={() => handleProcessRefund('REJECT')}
                            style={{ border: 'none', borderRadius: '6px', background: '#dc2626', color: '#fff', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            ✕ Từ chối yêu cầu hoàn tiền
                        </button>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="section-header">
                    <div>
                        <h1 style={{ fontSize: '22px' }}>Đơn hàng #{order.MaDon}</h1>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Ngày đặt: {new Date(order.NgayDat).toLocaleString('vi-VN')}
                        </div>
                    </div>

                    {!isTerminal && (
                        <form onSubmit={handleUpdateStatus} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <select
                                className="form-control"
                                style={{ width: 'auto', minWidth: '230px' }}
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={updating || selectedStatus === order.TrangThai}
                            >
                                {updating ? 'Đang lưu...' : 'Cập nhật trạng thái'}
                            </button>
                        </form>
                    )}
                </div>

                <div style={{ fontSize: '14px', display: 'grid', gap: '6px', marginBottom: '20px' }}>
                    <div><strong>Người nhận:</strong> {order.HoTenNhan} — {order.SdtNhan}</div>
                    <div><strong>Địa chỉ giao hàng:</strong> {order.DiaChiNhan}</div>
                    <div>
                        <strong>Tài khoản đặt:</strong>{' '}
                        {order.TenTaiKhoan ? `${order.TenTaiKhoan} (${order.EmailTaiKhoan})` : 'Khách vãng lai'}
                    </div>
                    <div><strong>Thanh toán:</strong> {order.PhuongThucThanhToan}</div>
                    {order.MaVanDon && (
                        <div>
                            <strong>Vận chuyển:</strong>{' '}
                            <span className="badge badge-info">{order.DonViVanChuyen}</span> — Mã vận đơn:{' '}
                            <strong style={{ color: '#0284c7' }}>{order.MaVanDon}</strong>
                        </div>
                    )}
                    {order.MaVoucher && (
                        <div>
                            <strong>Mã giảm giá áp dụng:</strong>{' '}
                            <span className="badge badge-success">{order.MaVoucher}</span>
                        </div>
                    )}
                    {order.GhiChu && <div><strong>Ghi chú:</strong> {order.GhiChu}</div>}
                    {order.LyDoHoanTien && (
                        <div style={{ color: '#b45309' }}>
                            <strong>Lý do trả hàng/hoàn tiền:</strong> {order.LyDoHoanTien}
                        </div>
                    )}
                    {order.PhanHoiHoanTien && (
                        <div style={{ color: '#1e40af' }}>
                            <strong>Phản hồi hoàn tiền của shop:</strong> {order.PhanHoiHoanTien}
                        </div>
                    )}
                </div>

                <OrderTrackingMap order={order} />

                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>SKU</th>
                                <th>Phân loại</th>
                                <th>SL</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.chiTiet || []).map((item) => (
                                <tr key={item.ChiTietId}>
                                    <td><strong>{item.TenSanPham}</strong></td>
                                    <td>{item.Sku}</td>
                                    <td>{item.Size} - {item.Mau}</td>
                                    <td>{item.SoLuong}</td>
                                    <td>{formatCurrency(item.DonGia)}</td>
                                    <td><strong>{formatCurrency(item.ThanhTien)}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
                        Tổng thanh toán: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(order.TongTien)}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOrderDetail;