import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import productService from '../../services/productService';
import Loading from '../../components/Loading';

const FALLBACK_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='16'>Chưa có ảnh</text></svg>";

const ProductEdit = () => {
    const { id } = useParams();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Thông tin sản phẩm
    const [tenSanPham, setTenSanPham] = useState('');
    const [danhMucId, setDanhMucId] = useState('');
    const [gia, setGia] = useState('');
    const [anhUrl, setAnhUrl] = useState('');
    const [moTa, setMoTa] = useState('');
    const [uploading, setUploading] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);
    const [infoMsg, setInfoMsg] = useState({ type: '', text: '' });

    // Danh sách biến thể hiện có
    const [variants, setVariants] = useState([]);
    const [variantMsg, setVariantMsg] = useState({ type: '', text: '' });

    // Form thêm biến thể mới
    const [newVar, setNewVar] = useState({ size: '', mau: '', sku: '', soLuongTon: 10 });
    const [addingVar, setAddingVar] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                productService.getProductById(id),
                productService.getCategories()
            ]);
            const p = prodRes.data;
            setCategories(catRes.data || []);
            setTenSanPham(p.TenSanPham || '');
            setDanhMucId(String(p.DanhMucId || ''));
            setGia(String(p.Gia || ''));
            setAnhUrl(p.AnhUrl || '');
            setMoTa(p.MoTa || '');
            setVariants(p.bienThe || []);
        } catch (err) {
            setInfoMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setInfoMsg({ type: '', text: '' });
        try {
            const res = await productService.uploadImage(file);
            if (res.data?.url) {
                setAnhUrl(res.data.url);
                setInfoMsg({ type: 'success', text: 'Tải ảnh mới lên thành công! Nhấn "Lưu thông tin sản phẩm" để áp dụng.' });
            }
        } catch (err) {
            setInfoMsg({ type: 'error', text: err.message || 'Lỗi tải ảnh lên máy chủ.' });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        setSavingInfo(true);
        setInfoMsg({ type: '', text: '' });
        try {
            await productService.updateProduct(id, {
                danhMucId: Number(danhMucId),
                tenSanPham: tenSanPham.trim(),
                gia: Number(gia),
                anhUrl: anhUrl.trim() || null,
                moTa: moTa.trim() || null
            });
            setInfoMsg({ type: 'success', text: 'Cập nhật thông tin sản phẩm thành công!' });
        } catch (err) {
            setInfoMsg({ type: 'error', text: err.message });
        } finally {
            setSavingInfo(false);
        }
    };

    const handleVariantFieldChange = (bienTheId, field, value) => {
        setVariants((prev) =>
            prev.map((v) => (v.BienTheId === bienTheId ? { ...v, [field]: value } : v))
        );
    };

    const handleSaveVariant = async (variant) => {
        setVariantMsg({ type: '', text: '' });
        try {
            await productService.updateVariant(variant.BienTheId, {
                size: variant.Size.trim(),
                mau: variant.Mau.trim(),
                sku: variant.Sku.trim(),
                soLuongTon: Number(variant.SoLuongTon)
            });
            setVariantMsg({ type: 'success', text: `Đã cập nhật biến thể ${variant.Sku}!` });
        } catch (err) {
            setVariantMsg({ type: 'error', text: err.message });
        }
    };

    const handleDeleteVariant = async (bienTheId, sku) => {
        if (!window.confirm(`Xóa biến thể "${sku}"?`)) return;
        setVariantMsg({ type: '', text: '' });
        try {
            await productService.deleteVariant(bienTheId);
            setVariants((prev) => prev.filter((v) => v.BienTheId !== bienTheId));
            setVariantMsg({ type: 'success', text: `Đã xóa biến thể ${sku}.` });
        } catch (err) {
            setVariantMsg({ type: 'error', text: err.message });
        }
    };

    const handleAddVariant = async (e) => {
        e.preventDefault();
        setAddingVar(true);
        setVariantMsg({ type: '', text: '' });
        try {
            await productService.addVariant(id, {
                size: newVar.size.trim(),
                mau: newVar.mau.trim(),
                sku: newVar.sku.trim(),
                soLuongTon: Number(newVar.soLuongTon) || 0
            });
            setNewVar({ size: '', mau: '', sku: '', soLuongTon: 10 });
            const prodRes = await productService.getProductById(id);
            setVariants(prodRes.data?.bienThe || []);
            setVariantMsg({ type: 'success', text: 'Thêm biến thể mới thành công!' });
        } catch (err) {
            setVariantMsg({ type: 'error', text: err.message });
        } finally {
            setAddingVar(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div style={{ maxWidth: '940px' }}>
            <div style={{ marginBottom: '14px' }}>
                <Link to="/admin/products" className="btn btn-outline btn-sm">
                    &larr; Quay lại danh sách sản phẩm
                </Link>
            </div>

            <h1 className="section-title" style={{ marginBottom: '18px' }}>
                Chỉnh sửa sản phẩm #{id}
            </h1>

            {/* Form 1: Thông tin chung */}
            <form className="card" style={{ marginBottom: '24px' }} onSubmit={handleUpdateProduct}>
                <h2 style={{ fontSize: '17px', marginBottom: '16px' }}>Thông tin sản phẩm</h2>

                {infoMsg.text && (
                    <div className={`alert ${infoMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {infoMsg.text}
                    </div>
                )}

                <div className="profile-grid">
                    <div className="form-group">
                        <label className="form-label">Tên sản phẩm *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
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
                                {uploading ? 'Đang tải ảnh...' : 'Đổi ảnh từ máy'}
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

                <div className="form-group">
                    <label className="form-label">Mô tả chi tiết</label>
                    <textarea
                        rows="3"
                        className="form-control"
                        value={moTa}
                        onChange={(e) => setMoTa(e.target.value)}
                    />
                </div>

                <button type="submit" className="btn btn-primary" disabled={savingInfo || uploading}>
                    {savingInfo ? 'Đang cập nhật...' : 'Lưu thông tin sản phẩm'}
                </button>
            </form>

            {/* Form 2: Quản lý biến thể */}
            <div className="card">
                <h2 style={{ fontSize: '17px', marginBottom: '16px' }}>
                    Quản lý biến thể (Size / Màu / Tồn kho)
                </h2>

                {variantMsg.text && (
                    <div className={`alert ${variantMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                        {variantMsg.text}
                    </div>
                )}

                <div className="table-wrap" style={{ marginBottom: '20px' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Size</th>
                                <th>Màu sắc</th>
                                <th>Mã SKU</th>
                                <th>Tồn kho</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Sản phẩm này chưa có biến thể nào.
                                    </td>
                                </tr>
                            ) : (
                                variants.map((v) => (
                                    <tr key={v.BienTheId}>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={v.Size}
                                                onChange={(e) =>
                                                    handleVariantFieldChange(v.BienTheId, 'Size', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={v.Mau}
                                                onChange={(e) =>
                                                    handleVariantFieldChange(v.BienTheId, 'Mau', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={v.Sku}
                                                onChange={(e) =>
                                                    handleVariantFieldChange(v.BienTheId, 'Sku', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                className="form-control"
                                                value={v.SoLuongTon}
                                                onChange={(e) =>
                                                    handleVariantFieldChange(v.BienTheId, 'SoLuongTon', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleSaveVariant(v)}
                                                >
                                                    Lưu
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleDeleteVariant(v.BienTheId, v.Sku)}
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

                {/* Thêm biến thể mới */}
                <form
                    onSubmit={handleAddVariant}
                    style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '16px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '10px',
                        alignItems: 'end'
                    }}
                >
                    <div>
                        <label className="form-label">Size mới *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="XL"
                            value={newVar.size}
                            onChange={(e) => setNewVar({ ...newVar, size: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Màu sắc *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="Xám"
                            value={newVar.mau}
                            onChange={(e) => setNewVar({ ...newVar, mau: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Mã SKU *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="SP001-XL-XAM"
                            value={newVar.sku}
                            onChange={(e) => setNewVar({ ...newVar, sku: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="form-label">Số lượng tồn *</label>
                        <input
                            type="number"
                            required
                            min="0"
                            className="form-control"
                            value={newVar.soLuongTon}
                            onChange={(e) => setNewVar({ ...newVar, soLuongTon: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="btn btn-accent" disabled={addingVar}>
                        {addingVar ? 'Đang thêm...' : '+ Thêm biến thể'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductEdit;