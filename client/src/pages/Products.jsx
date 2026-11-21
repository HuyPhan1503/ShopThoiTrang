import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import productService from '../services/productService';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';

const Products = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const danhMucId = searchParams.get('danhMucId') || '';
    const keyword = searchParams.get('keyword') || '';
    const sort = searchParams.get('sort') || 'moi_nhat';
    const minGia = searchParams.get('minGia') || '';
    const maxGia = searchParams.get('maxGia') || '';
    const page = Number(searchParams.get('page')) || 1;

    const [priceFrom, setPriceFrom] = useState(minGia);
    const [priceTo, setPriceTo] = useState(maxGia);

    useEffect(() => {
        productService
            .getCategories()
            .then((res) => setCategories(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setPriceFrom(minGia);
        setPriceTo(maxGia);
    }, [minGia, maxGia]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const res = await productService.getProducts({
                    page,
                    limit: 12,
                    danhMucId: danhMucId || undefined,
                    keyword: keyword || undefined,
                    minGia: minGia || undefined,
                    maxGia: maxGia || undefined,
                    sort
                });
                setProducts(res.data || []);
                setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [page, danhMucId, keyword, minGia, maxGia, sort]);

    const updateFilter = (updates) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, val]) => {
            if (val === '' || val === null || val === undefined) {
                next.delete(key);
            } else {
                next.set(key, val);
            }
        });
        if (!('page' in updates)) {
            next.set('page', '1');
        }
        setSearchParams(next);
    };

    const handleApplyPrice = (e) => {
        e.preventDefault();
        updateFilter({ minGia: priceFrom, maxGia: priceTo });
    };

    const handleReset = () => {
        setPriceFrom('');
        setPriceTo('');
        setSearchParams({});
    };

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">
                    {keyword ? `Kết quả tìm kiếm: "${keyword}"` : 'Danh sách sản phẩm'}
                </h1>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Hiển thị {products.length} / {pagination.total} sản phẩm
                </span>
            </div>

            <form className="filter-bar" onSubmit={handleApplyPrice}>
                <div>
                    <label className="form-label">Danh mục</label>
                    <select
                        className="form-control"
                        value={danhMucId}
                        onChange={(e) => updateFilter({ danhMucId: e.target.value })}
                    >
                        <option value="">Tất cả danh mục</option>
                        {categories.map((c) => (
                            <option key={c.DanhMucId} value={c.DanhMucId}>
                                {c.TenDanhMuc}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="form-label">Giá từ (VNĐ)</label>
                    <input
                        type="number"
                        min="0"
                        step="10000"
                        className="form-control"
                        placeholder="0"
                        value={priceFrom}
                        onChange={(e) => setPriceFrom(e.target.value)}
                    />
                </div>

                <div>
                    <label className="form-label">Đến giá (VNĐ)</label>
                    <input
                        type="number"
                        min="0"
                        step="10000"
                        className="form-control"
                        placeholder="2000000"
                        value={priceTo}
                        onChange={(e) => setPriceTo(e.target.value)}
                    />
                </div>

                <div>
                    <label className="form-label">Sắp xếp</label>
                    <select
                        className="form-control"
                        value={sort}
                        onChange={(e) => updateFilter({ sort: e.target.value })}
                    >
                        <option value="moi_nhat">Mới nhất</option>
                        <option value="gia_asc">Giá: Thấp đến Cao</option>
                        <option value="gia_desc">Giá: Cao đến Thấp</option>
                        <option value="cu_nhat">Cũ nhất</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        Lọc
                    </button>
                    <button type="button" onClick={handleReset} className="btn btn-outline">
                        Xóa lọc
                    </button>
                </div>
            </form>

            {loading ? (
                <Loading />
            ) : products.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Không tìm thấy sản phẩm nào phù hợp với điều kiện lọc.
                    </p>
                    <button type="button" onClick={handleReset} className="btn btn-primary">
                        Xem toàn bộ sản phẩm
                    </button>
                </div>
            ) : (
                <>
                    <div className="product-grid">
                        {products.map((product) => (
                            <ProductCard key={product.SanPhamId} product={product} />
                        ))}
                    </div>
                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(newPage) => updateFilter({ page: String(newPage) })}
                    />
                </>
            )}
        </div>
    );
};

export default Products;