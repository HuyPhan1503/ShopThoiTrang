import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/ProductCard';
import Loading from '../components/Loading';

const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='22'>ShopThoiTrang</text></svg>";

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { isAuthenticated } = useAuth();

    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedSize, setSelectedSize] = useState('');
    const [selectedMau, setSelectedMau] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [cartNotice, setCartNotice] = useState('');

    // Trạng thái quyền đánh giá (Verified Purchase)
    const [reviewStatus, setReviewStatus] = useState({
        checking: false,
        canReview: false,
        reason: ''
    });

    // Form đánh giá
    const [soSao, setSoSao] = useState(5);
    const [nhanXet, setNhanXet] = useState('');
    const [reviewMsg, setReviewMsg] = useState({ type: '', text: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError('');
            try {
                const [prodRes, revRes] = await Promise.all([
                    productService.getProductById(id),
                    productService.getReviewsByProduct(id)
                ]);
                const data = prodRes.data;
                setProduct(data);
                setReviews(revRes.data || []);

                const variants = data.bienThe || [];
                const defaultVar = variants.find((v) => v.SoLuongTon > 0) || variants[0];
                if (defaultVar) {
                    setSelectedSize(defaultVar.Size);
                    setSelectedMau(defaultVar.Mau);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    useEffect(() => {
        if (!isAuthenticated) {
            setReviewStatus({ checking: false, canReview: false, reason: 'GUEST' });
            return;
        }

        let cancelled = false;
        setReviewStatus((prev) => ({ ...prev, checking: true }));

        productService
            .checkCanReview(id)
            .then((res) => {
                if (!cancelled) {
                    setReviewStatus({
                        checking: false,
                        canReview: Boolean(res.data?.canReview),
                        reason: res.data?.reason || ''
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setReviewStatus({ checking: false, canReview: false, reason: 'NOT_PURCHASED' });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id, isAuthenticated]);

    const sizes = useMemo(() => {
        if (!product?.bienThe) return [];
        return [...new Set(product.bienThe.map((v) => v.Size))];
    }, [product]);

    const colors = useMemo(() => {
        if (!product?.bienThe) return [];
        return [...new Set(product.bienThe.map((v) => v.Mau))];
    }, [product]);

    const activeVariant = useMemo(() => {
        if (!product?.bienThe) return null;
        return product.bienThe.find((v) => v.Size === selectedSize && v.Mau === selectedMau) || null;
    }, [product, selectedSize, selectedMau]);

    useEffect(() => {
        setQuantity(1);
    }, [activeVariant]);

    const handleAddToCart = (goCheckout = false) => {
        if (!activeVariant || activeVariant.SoLuongTon <= 0) return;
        addToCart(product, activeVariant, quantity);
        if (goCheckout) {
            navigate('/checkout');
        } else {
            setCartNotice(`Đã thêm ${quantity} sản phẩm (${activeVariant.Size} - ${activeVariant.Mau}) vào giỏ hàng!`);
            setTimeout(() => setCartNotice(''), 3000);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        setReviewMsg({ type: '', text: '' });
        try {
            await productService.createReview({
                sanPhamId: Number(id),
                soSao,
                nhanXet
            });
            const [revRes, prodRes] = await Promise.all([
                productService.getReviewsByProduct(id),
                productService.getProductById(id)
            ]);
            setReviews(revRes.data || []);
            setProduct(prodRes.data);
            setNhanXet('');
            setReviewStatus({ checking: false, canReview: false, reason: 'ALREADY_REVIEWED' });
            setReviewMsg({ type: 'success', text: 'Cảm ơn bạn đã gửi đánh giá sản phẩm!' });
        } catch (err) {
            setReviewMsg({ type: 'error', text: err.message });
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) return <Loading />;
    if (error) return <div className="alert alert-error">{error}</div>;
    if (!product) return null;

    const maxQty = activeVariant ? activeVariant.SoLuongTon : 0;

    return (
        <div>
            <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                <Link to="/">Trang chủ</Link> / <Link to="/products">Sản phẩm</Link> /{' '}
                <span>{product.TenSanPham}</span>
            </div>

            <div className="card detail-grid" style={{ marginBottom: '32px' }}>
                <div style={{ background: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
                    <img
                        src={product.AnhUrl || FALLBACK_IMG}
                        alt={product.TenSanPham}
                        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                        onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMG;
                        }}
                    />
                </div>

                <div>
                    <span className="badge badge-gray" style={{ marginBottom: '8px' }}>
                        {product.TenDanhMuc}
                    </span>
                    <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>
                        {product.TenSanPham}
                    </h1>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Đánh giá: <strong>★ {product.DiemDanhGia || 0}</strong> ({reviews.length} nhận xét)
                    </div>

                    <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent)', marginBottom: '16px' }}>
                        {formatCurrency(product.Gia)}
                    </div>

                    {product.MoTa && (
                        <p style={{ color: '#374151', marginBottom: '20px', fontSize: '15px' }}>{product.MoTa}</p>
                    )}

                    {/* Chọn Size */}
                    <div className="form-group">
                        <label className="form-label">Kích cỡ (Size): {selectedSize}</label>
                        <div className="variant-options">
                            {sizes.map((sz) => (
                                <button
                                    key={sz}
                                    type="button"
                                    className={`variant-btn ${selectedSize === sz ? 'active' : ''}`}
                                    onClick={() => setSelectedSize(sz)}
                                >
                                    {sz}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chọn Màu */}
                    <div className="form-group">
                        <label className="form-label">Màu sắc: {selectedMau}</label>
                        <div className="variant-options">
                            {colors.map((mau) => (
                                <button
                                    key={mau}
                                    type="button"
                                    className={`variant-btn ${selectedMau === mau ? 'active' : ''}`}
                                    onClick={() => setSelectedMau(mau)}
                                >
                                    {mau}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Thông tin SKU & Tồn kho */}
                    <div style={{ fontSize: '14px', marginBottom: '18px', color: 'var(--text-muted)' }}>
                        {activeVariant ? (
                            <>
                                Mã SKU: <strong>{activeVariant.Sku}</strong> &bull; Tình trạng:{' '}
                                {activeVariant.SoLuongTon > 0 ? (
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                        Còn {activeVariant.SoLuongTon} sản phẩm
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Hết hàng</span>
                                )}
                            </>
                        ) : (
                            <span style={{ color: 'var(--danger)' }}>Phiên bản này không khả dụng</span>
                        )}
                    </div>

                    {/* Số lượng */}
                    {maxQty > 0 && (
                        <div className="form-group">
                            <label className="form-label">Số lượng</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxQty}
                                    value={quantity}
                                    onChange={(e) =>
                                        setQuantity(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))
                                    }
                                    className="form-control"
                                    style={{ width: '76px', textAlign: 'center' }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    {cartNotice && <div className="alert alert-success">{cartNotice}</div>}

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            disabled={maxQty <= 0}
                            onClick={() => handleAddToCart(false)}
                        >
                            Thêm vào giỏ hàng
                        </button>
                        <button
                            type="button"
                            className="btn btn-accent"
                            disabled={maxQty <= 0}
                            onClick={() => handleAddToCart(true)}
                        >
                            Mua ngay
                        </button>
                    </div>
                </div>
            </div>

            {/* Đánh giá sản phẩm */}
            <div className="card">
                <h2 className="section-title" style={{ marginBottom: '16px' }}>
                    Đánh giá từ khách hàng ({reviews.length})
                </h2>

                {reviewMsg.text && (
                    <div className={`alert ${reviewMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {reviewMsg.text}
                    </div>
                )}

                {!isAuthenticated ? (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#f9fafb',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            marginBottom: '20px',
                            fontSize: '14px',
                            color: 'var(--text-muted)'
                        }}
                    >
                        Vui lòng{' '}
                        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            đăng nhập
                        </Link>{' '}
                        và mua sản phẩm thành công để gửi đánh giá.
                    </div>
                ) : reviewStatus.checking ? (
                    <p style={{ marginBottom: '18px', fontSize: '14px', color: 'var(--text-muted)' }}>
                        Đang kiểm tra điều kiện đánh giá...
                    </p>
                ) : reviewStatus.canReview ? (
                    <form
                        onSubmit={handleSubmitReview}
                        style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}
                    >
                        <div className="form-group">
                            <label className="form-label">Chọn số sao</label>
                            <select
                                className="form-control"
                                style={{ maxWidth: '220px' }}
                                value={soSao}
                                onChange={(e) => setSoSao(Number(e.target.value))}
                            >
                                <option value={5}>★★★★★ (5 sao - Rất hài lòng)</option>
                                <option value={4}>★★★★☆ (4 sao - Hài lòng)</option>
                                <option value={3}>★★★☆☆ (3 sao - Bình thường)</option>
                                <option value={2}>★★☆☆☆ (2 sao - Chưa tốt)</option>
                                <option value={1}>★☆☆☆☆ (1 sao - Tệ)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nhận xét của bạn</label>
                            <textarea
                                rows="3"
                                className="form-control"
                                placeholder="Chia sẻ cảm nhận về chất liệu, kích cỡ..."
                                value={nhanXet}
                                onChange={(e) => setNhanXet(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={submittingReview}>
                            {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                        </button>
                    </form>
                ) : (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#f9fafb',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            marginBottom: '20px',
                            fontSize: '14px',
                            color: 'var(--text-muted)'
                        }}
                    >
                        {reviewStatus.reason === 'ALREADY_REVIEWED'
                            ? 'Bạn đã gửi đánh giá cho sản phẩm này rồi.'
                            : 'Chỉ khách hàng đã mua và nhận hàng thành công sản phẩm này mới có thể gửi đánh giá.'}
                    </div>
                )}

                {reviews.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        Chưa có đánh giá nào cho sản phẩm này.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {reviews.map((rev) => (
                            <div key={rev.DanhGiaId} style={{ paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <strong>{rev.HoTen}</strong>
                                        {Number(rev.DaMuaHang) === 1 && (
                                            <span className="badge badge-success" style={{ fontSize: '11px' }}>
                                                ✓ Đã mua hàng
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(rev.NgayTao).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '4px' }}>
                                    {'★'.repeat(rev.SoSao)}{'☆'.repeat(5 - rev.SoSao)}
                                </div>
                                {rev.NhanXet && <p style={{ fontSize: '14px', color: '#374151' }}>{rev.NhanXet}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetail;