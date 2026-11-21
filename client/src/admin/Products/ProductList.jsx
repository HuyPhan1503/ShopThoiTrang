import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import { formatCurrency } from '../../components/ProductCard';
import Pagination from '../../components/Pagination';
import Loading from '../../components/Loading';

const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='10'>No Img</text></svg>";

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [danhMucId, setDanhMucId] = useState('');
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        productService
            .getCategories()
            .then((res) => setCategories(res.data || []))
            .catch(() => {});
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await productService.getProducts({
                page,
                limit: 12,
                danhMucId: danhMucId || undefined,
                keyword: keyword || undefined,
                sort: 'moi_nhat'
            });
            setProducts(res.data || []);
            setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [page, danhMucId, keyword]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setKeyword(searchInput.trim());
    };

    const handleDelete = async (id, tenSanPham) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${tenSanPham}" không?`)) return;
        try {
            await productService.deleteProduct(id);
            fetchProducts();
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Quản lý sản phẩm ({pagination.total})</h1>
                <Link to="/admin/products/add" className="btn btn-primary btn-sm">
                    + Thêm sản phẩm mới
                </Link>
            </div>

            <form className="filter-bar" onSubmit={handleSearch}>
                <div>
                    <label className="form-label">Danh mục</label>
                    <select
                        className="form-control"
                        value={danhMucId}
                        onChange={(e) => {
                            setPage(1);
                            setDanhMucId(e.target.value);
                        }}
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
                    <label className="form-label">Tên sản phẩm</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập tên sản phẩm cần tìm..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        Tìm kiếm
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                            setSearchInput('');
                            setKeyword('');
                            setDanhMucId('');
                            setPage(1);
                        }}
                    >
                        Đặt lại
                    </button>
                </div>
            </form>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
                <Loading />
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Hình ảnh</th>
                                    <th>Tên sản phẩm</th>
                                    <th>Danh mục</th>
                                    <th>Giá bán</th>
                                    <th>Tổng tồn kho</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                            Không có sản phẩm nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((sp) => (
                                        <tr key={sp.SanPhamId}>
                                            <td>#{sp.SanPhamId}</td>
                                            <td>
                                                <img
                                                    src={sp.AnhUrl || FALLBACK_IMG}
                                                    alt={sp.TenSanPham}
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        objectFit: 'cover',
                                                        borderRadius: '6px',
                                                        border: '1px solid var(--border)'
                                                    }}
                                                    onError={(e) => {
                                                        e.currentTarget.src = FALLBACK_IMG;
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <strong>{sp.TenSanPham}</strong>
                                            </td>
                                            <td>{sp.TenDanhMuc}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                {formatCurrency(sp.Gia)}
                                            </td>
                                            <td>
                                                {Number(sp.TongTon) > 0 ? (
                                                    <span className="badge badge-success">{sp.TongTon} sp</span>
                                                ) : (
                                                    <span className="badge badge-danger">Hết hàng</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <Link
                                                        to={`/admin/products/edit/${sp.SanPhamId}`}
                                                        className="btn btn-outline btn-sm"
                                                    >
                                                        Sửa & Biến thể
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(sp.SanPhamId, sp.TenSanPham)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={(newPage) => setPage(newPage)}
                    />
                </>
            )}
        </div>
    );
};

export default ProductList;