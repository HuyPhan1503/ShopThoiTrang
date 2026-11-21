import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import { formatCurrency } from '../components/ProductCard';
import Loading from '../components/Loading';

const STATUS_MAP = {
    CHO_XAC_NHAN: { text: 'Chờ xác nhận', cls: 'badge-warning' },
    DA_XAC_NHAN: { text: 'Đang chuẩn bị hàng', cls: 'badge-info' },
    DANG_GIAO: { text: 'Đang giao hàng', cls: 'badge-info' },
    HOAN_THANH: { text: 'Hoàn thành', cls: 'badge-success' },
    DA_HUY: { text: 'Đã hủy', cls: 'badge-danger' },
    YEU_CAU_HOAN_TIEN: { text: 'Đang yêu cầu hoàn tiền', cls: 'badge-warning' },
    DA_HOAN_TIEN: { text: 'Đã hoàn tiền', cls: 'badge-danger' }
};

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await orderService.getMyOrders();
            setOrders(res.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleCancel = async (donHangId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
        try {
            await orderService.cancelOrder(donHangId);
            fetchOrders();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleConfirmReceived = async (donHangId) => {
        if (!window.confirm('Bạn đã kiểm tra hàng và xác nhận nhận đủ sản phẩm của đơn hàng này?')) return;
        try {
            await orderService.confirmReceived(donHangId);
            fetchOrders();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <Loading />;

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Đơn hàng của tôi</h1>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {orders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Bạn chưa có đơn hàng nào.
                    </p>
                    <Link to="/products" className="btn btn-primary">
                        Khám phá sản phẩm ngay
                    </Link>
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Mã đơn / Vận đơn</th>
                                <th>Ngày đặt</th>
                                <th>Người nhận</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => {
                                const st = STATUS_MAP[order.TrangThai] || { text: order.TrangThai, cls: 'badge-gray' };
                                return (
                                    <tr key={order.DonHangId}>
                                        <td>
                                            <Link to={`/orders/${order.DonHangId}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                {order.MaDon}
                                            </Link>
                                            {order.MaVanDon && (
                                                <div style={{ fontSize: '11.5px', color: '#0284c7', marginTop: '2px' }}>
                                                    {order.DonViVanChuyen}: <strong>{order.MaVanDon}</strong>
                                                </div>
                                            )}
                                        </td>
                                        <td>{new Date(order.NgayDat).toLocaleDateString('vi-VN')}</td>
                                        <td>
                                            <div>{order.HoTenNhan}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.SdtNhan}</div>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(order.TongTien)}</td>
                                        <td>
                                            <span className={`badge ${st.cls}`}>{st.text}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <Link to={`/orders/${order.DonHangId}`} className="btn btn-outline btn-sm">
                                                    {order.TrangThai === 'HOAN_THANH' ? 'Chi tiết & Đánh giá' : 'Chi tiết'}
                                                </Link>
                                                {order.TrangThai === 'DANG_GIAO' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleConfirmReceived(order.DonHangId)}
                                                    >
                                                        Đã nhận được hàng
                                                    </button>
                                                )}
                                                {order.TrangThai === 'CHO_XAC_NHAN' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleCancel(order.DonHangId)}
                                                    >
                                                        Hủy đơn
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyOrders;