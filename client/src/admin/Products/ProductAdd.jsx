import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';

const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='16'>Chưa có ảnh</text></svg>";

const ProductAdd = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);

    const [tenSanPham, setTenSanPham] = useState('');
    const [danhMucId, setDanhMucId] = useState('');
    const [gia, setGia] = useState('');
    const [anhUrl, setAnhUrl] = useState('');
    const [moTa, setMoTa] = useState('');
    const [uploading, setUploading] = useState(false);

    const [variants, setVariants] = useState([
        { size: 'M', mau: 'Đen', sku: '', soLuongTon: 10 }
    ]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        productService
            .getCategories()
            .then((res) => {
                const list = res.data || [];
                setCategories(list);
                if (list.length > 0) {
                    setDanhMucId(String(list[0].DanhMucId));
                }
            })
            .catch(() => {});
    }, []);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');
        try {
            const res = await productService.uploadImage(file);
            if (res.data?.url) {
                setAnhUrl(res.data.url);
            }
        } catch (err) {
            setError(err.message || 'Lỗi tải ảnh lên máy chủ.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleVariantChange = (index, field, value) => {
        const next = [...variants];
        next[index] = { ...next[index], [field]: value };
        setVariants(next);
    };

    const addVariantRow = () => {
        setVariants([...variants, { size: 'L', mau: 'Trắng', sku: '', soLuongTon: 10 }]);
    };

    const removeVariantRow = (index) => {
        if (variants.length <= 1) return;
        setVariants(variants.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const cleanedVariants = variants.map((v) => ({
                size: v.size.trim(),
                mau: v.mau.trim(),
                sku: v.sku.trim(),
                soLuongTon: Number(v.soLuongTon) || 0
            }));

            const res = await productService.createProduct({
                danhMucId: Number(danhMucId),
                tenSanPham: tenSanPham.trim(),
                gia: Number(gia),
                anhUrl: anhUrl.trim() || null,
                moTa: moTa.trim() || null,
                bienThe: cleanedVariants
            });

            const created = res.data;
            if (created?.SanPhamId && (!created.bienThe || created.bienThe.length === 0)) {
                for (const v of cleanedVariants) {
                    await productService.addVariant(created.SanPhamId, v);
                }
            }

            navigate('/admin/products');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px' }}>
            <div style={{ marginBottom: '14px' }}>
                <Link to="/admin/products" className="btn btn-outline btn-sm">
                    &larr; Quay lại danh sách sản phẩm
                </Link>
            </div>

            <h1 className="section-title" style={{ marginBottom: '18px' }}>
                Thêm sản phẩm mới
            </h1>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '17px', marginBottom: '16px' }}>Thông tin cơ bản</h2>

                    <div className="profile-grid">
                        <div className="form-group">
                            <label className="form-label">Tên sản phẩm *</label>
                            <input
                                type="text"
                                required
                                className="form-control"
                                placeholder="Áo thun Cotton Basic"
                                value={tenSanPham}
                                onChange={(e) => setTenSanPham(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Danh mục *</label>
                            <select
                                required
                                className="form-control"
                                value={danhMucId}
                                onChange={(e) => setDanhMucId(e.target.value)}
                            >
                                <option value="">-- Chọn danh mục --</option>
                                {categories.map((c) => (
                                    <option key={c.DanhMucId} value={c.DanhMucId}>
                                        {c.TenDanhMuc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Giá bán (VNĐ) *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="1000"
                                className="form-control"
                                placeholder="199000"
                                value={gia}
                                onChange={(e) => setGia(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Hình ảnh sản phẩm (Chọn từ máy tính hoặc nhập URL)</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                <label
                                    className="btn btn-outline btn-sm"
                                    style={{ cursor: uploading ? 'not-allowed' : 'pointer', margin: 0 }}
                                >
                                    {uploading ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy'}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        disabled={uploading}
                                        onChange={handleImageUpload}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                                {anhUrl && (
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setAnhUrl('')}
                                    >
                                        Xóa ảnh
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Hoặc dán đường dẫn ảnh (https://...)"
                                value={anhUrl}
                                onChange={(e) => setAnhUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Khung xem trước ảnh */}
                    <div className="form-group">
                        <label className="form-label">Xem trước hình ảnh</label>
                        <div
                            style={{
                                width: '150px',
                                height: '150px',
                                border: '1px dashed var(--border)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: '#f9fafb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <img
                                src={anhUrl || FALLBACK_IMG}
                                alt="Xem trước sản phẩm"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.currentTarget.src = FALLBACK_IMG;
                                }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Mô tả chi tiết</label>
                        <textarea
                            rows="3"
                            className="form-control"
                            placeholder="Chất liệu, phom dáng, hướng dẫn bảo quản..."
                            value={moTa}
                            onChange={(e) => setMoTa(e.target.value)}
                        />
                    </div>
                </div>

                {/* Biến thể Size / Màu / Tồn kho */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="section-header">
                        <h2 style={{ fontSize: '17px' }}>Biến thể sản phẩm (Size, Màu & Tồn kho)</h2>
                        <button type="button" onClick={addVariantRow} className="btn btn-outline btn-sm">
                            + Thêm biến thể
                        </button>
                    </div>

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Size *</th>
                                    <th>Màu sắc *</th>
                                    <th>Mã SKU *</th>
                                    <th>Số lượng tồn *</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                placeholder="S, M, L, XL..."
                                                value={v.size}
                                                onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                placeholder="Đen, Trắng, Navy..."
                                                value={v.mau}
                                                onChange={(e) => handleVariantChange(idx, 'mau', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                required
                                                className="form-control"
                                                placeholder="SP021-M-DEN"
                                                value={v.sku}
                                                onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                className="form-control"
                                                value={v.soLuongTon}
                                                onChange={(e) =>
                                                    handleVariantChange(idx, 'soLuongTon', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                disabled={variants.length <= 1}
                                                onClick={() => removeVariantRow(idx)}
                                            >
                                                Xóa
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                        {saving ? 'Đang lưu sản phẩm...' : 'Lưu sản phẩm'}
                    </button>
                    <Link to="/admin/products" className="btn btn-outline">
                        Hủy
                    </Link>
                </div>
            </form>
        </div>
    );
};

export default ProductAdd;