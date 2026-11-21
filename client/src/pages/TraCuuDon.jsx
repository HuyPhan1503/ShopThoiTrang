import { useState } from 'react';
import orderService from '../services/orderService';
import { formatCurrency } from '../components/ProductCard';
import VietQrBox from '../components/VietQrBox';
import OrderTrackingMap from '../components/OrderTrackingMap';

const STATUS_LABELS = {
    CHO_XAC_NHAN: { text: 'Chờ xác nhận', cls: 'badge-warning' },
    DA_XAC_NHAN: { text: 'Đã xác nhận', cls: 'badge-info' },
    DANG_GIAO: { text: 'Đang giao hàng', cls: 'badge-info' },
    HOAN_THANH: { text: 'Hoàn thành', cls: 'badge-success' },
    DA_HUY: { text: 'Đã hủy', cls: 'badge-danger' }
};

const TraCuuDon = () => {
    const [maDon, setMaDon] = useState('');
    const [soDienThoai, setSoDienThoai] = useState('');
    const [order, setOrder] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        setOrder(null);
        setLoading(true);
        try {
            const res = await orderService.trackOrder(maDon, soDienThoai);
            setOrder(res.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const statusInfo = order ? STATUS_LABELS[order.TrangThai] || { text: order.TrangThai, cls: 'badge-gray' } : null;
    const soTienGiam = order ? Number(order.SoTienGiam || 0) : 0;
    const tamTinh = order
        ? (order.chiTiet || []).reduce((sum, item) => sum + Number(item.ThanhTien || 0), 0) ||
          Number(order.TongTien || 0) + soTienGiam
        : 0;

    return (
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
            <div className="card" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>Tra cứu đơn hàng</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '18px' }}>
                    Nhập mã đơn hàng (ví dụ: DH000001) và số điện thoại nhận hàng để kiểm tra trạng thái.
                </p>

                <form
                    onSubmit={handleSearch}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}
                >
                    <div>
                        <label className="form-label">Mã đơn hàng *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="DH000001"
                            value={maDon}
                            onChange={(e) => setMaDon(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="form-label">Số điện thoại nhận hàng *</label>
                        <input
                            type="tel"
                            required
                            className="form-control"
                            placeholder="0988777666"
                            value={soDienThoai}
                            onChange={(e) => setSoDienThoai(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Đang tìm...' : 'Tra cứu'}
                    </button>
                </form>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {order && (
                <div className="card">
                    <div className="section-header">
                        <div>
                            <h2 style={{ fontSize: '20px' }}>Đơn hàng #{order.MaDon}</h2>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                Ngày đặt: {new Date(order.NgayDat).toLocaleString('vi-VN')}
                            </span>
                        </div>
                        <span className={`badge ${statusInfo.cls}`}>{statusInfo.text}</span>
                    </div>

                    <OrderTrackingMap order={order} />

                    <div style={{ fontSize: '14px', marginBottom: '18px', display: 'grid', gap: '6px' }}>
                        <div><strong>Người nhận:</strong> {order.HoTenNhan} — {order.SdtNhan}</div>
                        <div><strong>Địa chỉ:</strong> {order.DiaChiNhan}</div>
                        <div><strong>Thanh toán:</strong> {order.PhuongThucThanhToan}</div>
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
                                </tr>
                            </thead>
                            <tbody>
                                {(order.chiTiet || []).map((item) => (
                                    <tr key={item.ChiTietId}>
                                        <td>{item.TenSanPham}</td>
                                        <td>{item.Size} - {item.Mau}</td>
                                        <td>{item.SoLuong}</td>
                                        <td>{formatCurrency(item.DonGia)}</td>
                                        <td><strong>{formatCurrency(item.ThanhTien)}</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div
                        style={{
                            marginTop: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '6px'
                        }}
                    >
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
                        <div style={{ fontSize: '18px' }}>
                            Tổng thanh toán: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(order.TongTien)}</strong>
                        </div>
                    </div>

                    {order.vietQr && order.TrangThai === 'CHO_XAC_NHAN' && (
                        <VietQrBox vietQr={order.vietQr} onPaymentConfirmed={(updated) => setOrder(updated)} />
                    )}
                </div>
            )}
        </div>
    );
};

export default TraCuuDon;