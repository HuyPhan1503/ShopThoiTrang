import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import productService from '../../services/productService';
import Loading from '../../components/Loading';

const CategoryForm = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [tenDanhMuc, setTenDanhMuc] = useState('');
    const [moTa, setMoTa] = useState('');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isEdit) return;
        const loadCategory = async () => {
            try {
                const res = await productService.getCategoryById(id);
                setTenDanhMuc(res.data?.TenDanhMuc || '');
                setMoTa(res.data?.MoTa || '');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadCategory();
    }, [id, isEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (isEdit) {
                await productService.updateCategory(id, { tenDanhMuc, moTa });
            } else {
                await productService.createCategory({ tenDanhMuc, moTa });
            }
            navigate('/admin/categories');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div style={{ maxWidth: '580px' }}>
            <div style={{ marginBottom: '14px' }}>
                <Link to="/admin/categories" className="btn btn-outline btn-sm">
                    &larr; Quay lại danh sách danh mục
                </Link>
            </div>

            <div className="card">
                <h1 className="section-title" style={{ marginBottom: '18px' }}>
                    {isEdit ? `Cập nhật danh mục #${id}` : 'Thêm danh mục mới'}
                </h1>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tên danh mục *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="Ví dụ: Áo thun nam, Quần Jean..."
                            value={tenDanhMuc}
                            onChange={(e) => setTenDanhMuc(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mô tả</label>
                        <textarea
                            rows="3"
                            className="form-control"
                            placeholder="Mô tả ngắn gọn về danh mục..."
                            value={moTa}
                            onChange={(e) => setMoTa(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo danh mục'}
                        </button>
                        <Link to="/admin/categories" className="btn btn-outline">
                            Hủy
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryForm;