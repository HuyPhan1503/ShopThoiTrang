import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import Loading from '../../components/Loading';

const CategoryList = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadCategories = async () => {
        setLoading(true);
        try {
            const res = await productService.getCategories();
            setCategories(res.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleDelete = async (id, tenDanhMuc) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${tenDanhMuc}" không?`)) return;
        try {
            await productService.deleteCategory(id);
            loadCategories();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <Loading />;

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Quản lý danh mục</h1>
                <Link to="/admin/categories/add" className="btn btn-primary btn-sm">
                    + Thêm danh mục
                </Link>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên danh mục</th>
                            <th>Mô tả</th>
                            <th>Số sản phẩm</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Chưa có danh mục nào.
                                </td>
                            </tr>
                        ) : (
                            categories.map((cat) => (
                                <tr key={cat.DanhMucId}>
                                    <td>#{cat.DanhMucId}</td>
                                    <td>
                                        <strong>{cat.TenDanhMuc}</strong>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{cat.MoTa || '—'}</td>
                                    <td>{cat.SoSanPham ?? 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <Link
                                                to={`/admin/categories/edit/${cat.DanhMucId}`}
                                                className="btn btn-outline btn-sm"
                                            >
                                                Sửa
                                            </Link>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(cat.DanhMucId, cat.TenDanhMuc)}
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
        </div>
    );
};

export default CategoryList;