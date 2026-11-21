import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../services/productService';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [openFaqId, setOpenFaqId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const [prodRes, catRes, faqRes] = await Promise.all([
                    productService.getProducts({ limit: 8, sort: 'moi_nhat' }),
                    productService.getCategories(),
                    productService.getFaqs()
                ]);
                setProducts(prodRes.data || []);
                setCategories(catRes.data || []);
                setFaqs(faqRes.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHomeData();
    }, []);

    if (loading) return <Loading />;

    return (
        <div>
            {/* Hero Banner */}
            <section className="hero-banner">
                <div>
                    <span className="badge badge-danger" style={{ marginBottom: '12px' }}>
                        BỘ SƯU TẬP MỚI
                    </span>
                    <h1 className="hero-title">Phong Cách Tối Giản, Tự Tin Mỗi Ngày</h1>
                    <p className="hero-subtitle">
                        Khám phá các thiết kế áo thun, sơ mi, quần jean và phụ kiện chuẩn phom dáng, chất liệu thoáng mát cùng chính sách kiểm tra hàng trước khi thanh toán.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Link to="/products" className="btn btn-accent">
                            Mua sắm ngay
                        </Link>
                        <Link to="/tra-cuu-don" className="btn btn-outline">
                            Tra cứu đơn hàng
                        </Link>
                    </div>
                </div>
            </section>

            {/* Danh mục nổi bật */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">Danh mục sản phẩm</h2>
                </div>
                <div className="category-chips">
                    {categories.map((cat) => (
                        <Link
                            key={cat.DanhMucId}
                            to={`/products?danhMucId=${cat.DanhMucId}`}
                            className="category-chip"
                        >
                            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                                {cat.TenDanhMuc}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {cat.SoSanPham} sản phẩm
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Sản phẩm mới */}
            <section style={{ marginBottom: '44px' }}>
                <div className="section-header">
                    <h2 className="section-title">Sản phẩm mới nhất</h2>
                    <Link to="/products" className="btn btn-outline btn-sm">
                        Xem tất cả &rarr;
                    </Link>
                </div>

                {products.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Chưa có sản phẩm nào.</p>
                ) : (
                    <div className="product-grid">
                        {products.map((product) => (
                            <ProductCard key={product.SanPhamId} product={product} />
                        ))}
                    </div>
                )}
            </section>

            {/* Câu hỏi thường gặp (FAQ) */}
            {faqs.length > 0 && (
                <section>
                    <div className="section-header">
                        <h2 className="section-title">Câu hỏi thường gặp</h2>
                    </div>
                    <div>
                        {faqs.map((faq) => {
                            const isOpen = openFaqId === faq.CauHoiId;
                            return (
                                <div key={faq.CauHoiId} className="faq-item">
                                    <button
                                        type="button"
                                        className="faq-question"
                                        onClick={() => setOpenFaqId(isOpen ? null : faq.CauHoiId)}
                                    >
                                        <span>
                                            <span className="badge badge-gray" style={{ marginRight: '8px' }}>
                                                {faq.ChuDe}
                                            </span>
                                            {faq.CauHoi}
                                        </span>
                                        <span>{isOpen ? '−' : '+'}</span>
                                    </button>
                                    {isOpen && <div className="faq-answer">{faq.TraLoi}</div>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;