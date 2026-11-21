import { Link } from 'react-router-dom';

const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'><rect width='400' height='400' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='18'>ShopThoiTrang</text></svg>";

export const formatCurrency = (amount) => {
    return `${new Intl.NumberFormat('vi-VN').format(Number(amount || 0))} ₫`;
};

const ProductCard = ({ product }) => {
    const outOfStock = Number(product.TongTon) <= 0;

    return (
        <Link to={`/products/${product.SanPhamId}`} className="product-card">
            <div className="product-card-img">
                <img
                    src={product.AnhUrl || FALLBACK_IMG}
                    alt={product.TenSanPham}
                    onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMG;
                    }}
                />
                {outOfStock && (
                    <span
                        className="badge badge-danger"
                        style={{ position: 'absolute', top: '10px', left: '10px' }}
                    >
                        Hết hàng
                    </span>
                )}
            </div>

            <div className="product-card-body">
                <div className="product-card-cat">{product.TenDanhMuc}</div>
                <h3 className="product-card-title">{product.TenSanPham}</h3>

                <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                        {Number(product.SoDanhGia) > 0
                            ? `★ ${product.DiemDanhGia} (${product.SoDanhGia})`
                            : 'Chưa có đánh giá'}
                    </span>
                    <span>Còn {product.TongTon} sp</span>
                </div>

                <div className="product-card-price">{formatCurrency(product.Gia)}</div>
            </div>
        </Link>
    );
};

export default ProductCard;