import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/ProductCard';

const Cart = () => {
    const { cartItems, totalItems, totalAmount, updateQuantity, removeFromCart, clearCart } = useCart();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleProceedToCheckout = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: '/checkout' } });
            return;
        }
        navigate('/checkout');
    };

    if (cartItems.length === 0) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '56px 16px' }}>
                <h2 style={{ marginBottom: '8px' }}>Giỏ hàng của bạn đang trống</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Hãy khám phá thêm các mẫu thời trang mới nhất tại cửa hàng.
                </p>
                <Link to="/products" className="btn btn-primary">
                    Tiếp tục mua sắm
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Giỏ hàng ({totalItems} sản phẩm)</h1>
                <button type="button" onClick={clearCart} className="btn btn-outline btn-sm">
                    Xóa toàn bộ giỏ
                </button>
            </div>

            <div className="checkout-grid">
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Đơn giá</th>
                                <th>Số lượng</th>
                                <th>Thành tiền</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cartItems.map((item) => (
                                <tr key={item.bienTheId}>
                                    <td>
                                        <Link to={`/products/${item.sanPhamId}`} style={{ fontWeight: 600 }}>
                                            {item.tenSanPham}
                                        </Link>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Size: {item.size} | Màu: {item.mau} ({item.sku})
                                        </div>
                                    </td>
                                    <td>{formatCurrency(item.gia)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => updateQuantity(item.bienTheId, item.soLuong - 1)}
                                            >
                                                −
                                            </button>
                                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
                                                {item.soLuong}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                disabled={item.soLuong >= item.soLuongTon}
                                                onClick={() => updateQuantity(item.bienTheId, item.soLuong + 1)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{formatCurrency(item.gia * item.soLuong)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => removeFromCart(item.bienTheId)}
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Tóm tắt đơn hàng</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                        <span>Tổng số lượng:</span>
                        <strong>{totalItems} sản phẩm</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                        <span>Phí vận chuyển:</span>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Miễn phí</span>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '18px' }}>
                        <strong>Tổng cộng:</strong>
                        <strong style={{ color: 'var(--accent)' }}>{formatCurrency(totalAmount)}</strong>
                    </div>

                    {!isAuthenticated && (
                        <div
                            style={{
                                padding: '10px 12px',
                                marginBottom: '12px',
                                borderRadius: '6px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                fontSize: '13px',
                                lineHeight: 1.4
                            }}
                        >
                            Vui lòng đăng nhập tài khoản để tiến hành đặt hàng và quản lý đơn hàng của bạn.
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleProceedToCheckout}
                        className="btn btn-accent"
                        style={{ width: '100%', marginBottom: '10px' }}
                    >
                        {isAuthenticated ? 'Tiến hành đặt hàng' : 'Đăng nhập để đặt hàng'}
                    </button>
                    <Link to="/products" className="btn btn-outline" style={{ width: '100%' }}>
                        Mua thêm sản phẩm khác
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Cart;