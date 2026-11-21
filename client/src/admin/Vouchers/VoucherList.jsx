import { useEffect, useState } from 'react';
import voucherService from '../../services/voucherService';
import { formatCurrency } from '../../components/ProductCard';
import Loading from '../../components/Loading';

const toLocalInput = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = () => {
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
        maCode: '',
        moTa: '',
        loaiGiam: 'TIEN',
        giaTriGiam: 50000,
        giamToiDa: '',
        donToiThieu: 200000,
        soLuong: 50,
        ngayBatDau: toLocalInput(now),
        ngayKetThuc: toLocalInput(nextMonth),
        trangThai: 1
    };
};

const VoucherList = () => {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const loadVouchers = async () => {
        setLoading(true);
        try {
            const res = await voucherService.getAllAdmin();
            setVouchers(res.data || []);
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadVouchers();
    }, []);

    const handleEdit = (v) => {
        setEditingId(v.VoucherId);
        setMsg({ type: '', text: '' });
        setForm({
            maCode: v.MaCode,
            moTa: v.MoTa || '',
            loaiGiam: v.LoaiGiam,
            giaTriGiam: Number(v.GiaTriGiam),
            giamToiDa: v.GiamToiDa ? Number(v.GiamToiDa) : '',
            donToiThieu: Number(v.DonToiThieu) || 0,
            soLuong: Number(v.SoLuong) || 1,
            ngayBatDau: toLocalInput(v.NgayBatDau),
            ngayKetThuc: toLocalInput(v.NgayKetThuc),
            trangThai: Number(v.TrangThai)
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg({ type: '', text: '' });
        try {
            const payload = {
                ...form,
                maCode: form.maCode.trim().toUpperCase(),
                giaTriGiam: Number(form.giaTriGiam),
                giamToiDa: form.loaiGiam === 'PHAN_TRAM' && form.giamToiDa ? Number(form.giamToiDa) : null,
                donToiThieu: Number(form.donToiThieu) || 0,
                soLuong: Number(form.soLuong) || 1,
                trangThai: Number(form.trangThai)
            };

            if (editingId) {
                await voucherService.updateVoucher(editingId, payload);
                setMsg({ type: 'success', text: `Đã cập nhật mã ${payload.maCode}!` });
            } else {
                await voucherService.createVoucher(payload);
                setMsg({ type: 'success', text: `Đã tạo mã giảm giá ${payload.maCode}!` });
            }
            resetForm();
            await loadVouchers();
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (v) => {
        if (!window.confirm(`Xóa vĩnh viễn mã giảm giá "${v.MaCode}"?`)) return;
        setMsg({ type: '', text: '' });
        try {
            await voucherService.deleteVoucher(v.VoucherId);
            setMsg({ type: 'success', text: `Đã xóa mã ${v.MaCode}.` });
            if (editingId === v.VoucherId) resetForm();
            await loadVouchers();
        } catch (err) {
            setMsg({ type: 'error', text: err.message });
        }
    };

    const totalDiscountGiven = vouchers.reduce((sum, v) => sum + Number(v.TongTienDaGiam || 0), 0);
    const totalRevenueFromVouchers = vouchers.reduce((sum, v) => sum + Number(v.DoanhThuMangLai || 0), 0);

    if (loading) return <Loading />;

    return (
        <div>
            <h1 className="section-title" style={{ marginBottom: '18px' }}>
                Quản lý mã giảm giá (Voucher)
            </h1>

            {/* Thống kê hiệu quả */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                    marginBottom: '20px'
                }}
            >
                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng số mã đã tạo</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px' }}>{vouchers.length}</div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng tiền đã giảm cho khách</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
                        {formatCurrency(totalDiscountGiven)}
                    </div>
                </div>
                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Doanh thu đơn hoàn thành có mã</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>
                        {formatCurrency(totalRevenueFromVouchers)}
                    </div>
                </div>
            </div>

            {msg.text && (
                <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {msg.text}
                </div>
            )}

            {/* Form tạo / sửa mã */}
            <form className="card" style={{ marginBottom: '24px' }} onSubmit={handleSubmit}>
                <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>
                    {editingId ? `Chỉnh sửa mã #${editingId}` : 'Tạo mã giảm giá mới'}
                </h2>

                <div className="profile-grid">
                    <div className="form-group">
                        <label className="form-label">Mã code *</label>
                        <input
                            type="text"
                            required
                            className="form-control"
                            placeholder="VD: SUMMER2026"
                            value={form.maCode}
                            onChange={(e) => setForm({ ...form, maCode: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Loại ưu đãi *</label>
                        <select
                            className="form-control"
                            value={form.loaiGiam}
                            onChange={(e) => setForm({ ...form, loaiGiam: e.target.value })}
                        >
                            <option value="TIEN">Giảm số tiền cố định (VNĐ)</option>
                            <option value="PHAN_TRAM">Giảm theo phần trăm (%)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {form.loaiGiam === 'TIEN' ? 'Số tiền giảm (VNĐ) *' : 'Phần trăm giảm (%) *'}
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max={form.loaiGiam === 'PHAN_TRAM' ? 100 : undefined}
                            className="form-control"
                            value={form.giaTriGiam}
                            onChange={(e) => setForm({ ...form, giaTriGiam: e.target.value })}
                        />
                    </div>

                    {form.loaiGiam === 'PHAN_TRAM' && (
                        <div className="form-group">
                            <label className="form-label">Giảm tối đa (VNĐ - bỏ trống nếu không giới hạn)</label>
                            <input
                                type="number"
                                min="0"
                                step="1000"
                                className="form-control"
                                placeholder="VD: 80000"
                                value={form.giamToiDa}
                                onChange={(e) => setForm({ ...form, giamToiDa: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Đơn hàng tối thiểu (VNĐ)</label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            className="form-control"
                            value={form.donToiThieu}
                            onChange={(e) => setForm({ ...form, donToiThieu: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tổng số lượt sử dụng *</label>
                        <input
                            type="number"
                            required
                            min="1"
                            className="form-control"
                            value={form.soLuong}
                            onChange={(e) => setForm({ ...form, soLuong: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thời gian bắt đầu *</label>
                        <input
                            type="datetime-local"
                            required
                            className="form-control"
                            value={form.ngayBatDau}
                            onChange={(e) => setForm({ ...form, ngayBatDau: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thời gian kết thúc *</label>
                        <input
                            type="datetime-local"
                            required
                            className="form-control"
                            value={form.ngayKetThuc}
                            onChange={(e) => setForm({ ...form, ngayKetThuc: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Trạng thái</label>
                        <select
                            className="form-control"
                            value={form.trangThai}
                            onChange={(e) => setForm({ ...form, trangThai: Number(e.target.value) })}
                        >
                            <option value={1}>Đang kích hoạt</option>
                            <option value={0}>Tạm khóa</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Mô tả hiển thị cho khách</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="VD: Giảm 50K cho đơn từ 300K"
                            value={form.moTa}
                            onChange={(e) => setForm({ ...form, moTa: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Đang lưu...' : editingId ? 'Cập nhật mã' : '+ Tạo mã giảm giá'}
                    </button>
                    {editingId && (
                        <button type="button" className="btn btn-outline" onClick={resetForm}>
                            Hủy chỉnh sửa
                        </button>
                    )}
                </div>
            </form>

            {/* Danh sách mã hiện có */}
            <div className="card">
                <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>Danh sách mã giảm giá</h2>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Mã Code</th>
                                <th>Mức giảm</th>
                                <th>Đơn tối thiểu</th>
                                <th>Lượt dùng</th>
                                <th>Hiệu lực</th>
                                <th>Đã giảm / Doanh thu</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vouchers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Chưa có mã giảm giá nào.
                                    </td>
                                </tr>
                            ) : (
                                vouchers.map((v) => {
                                    const expired = new Date(v.NgayKetThuc) < new Date();
                                    return (
                                        <tr key={v.VoucherId}>
                                            <td>
                                                <strong>{v.MaCode}</strong>
                                                {v.MoTa && (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        {v.MoTa}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {v.LoaiGiam === 'TIEN' ? (
                                                    <strong>{formatCurrency(v.GiaTriGiam)}</strong>
                                                ) : (
                                                    <div>
                                                        <strong>{v.GiaTriGiam}%</strong>
                                                        {v.GiamToiDa && (
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                                Tối đa {formatCurrency(v.GiamToiDa)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td>{formatCurrency(v.DonToiThieu)}</td>
                                            <td>
                                                {v.DaSuDung} / {v.SoLuong}
                                            </td>
                                            <td style={{ fontSize: '12px' }}>
                                                <div>Từ: {new Date(v.NgayBatDau).toLocaleDateString('vi-VN')}</div>
                                                <div>Đến: {new Date(v.NgayKetThuc).toLocaleDateString('vi-VN')}</div>
                                            </td>
                                            <td style={{ fontSize: '12px' }}>
                                                <div style={{ color: '#dc2626' }}>
                                                    Giảm: {formatCurrency(v.TongTienDaGiam)}
                                                </div>
                                                <div style={{ color: '#15803d' }}>
                                                    Thu: {formatCurrency(v.DoanhThuMangLai)}
                                                </div>
                                            </td>
                                            <td>
                                                {Number(v.TrangThai) !== 1 ? (
                                                    <span className="badge badge-danger">Tạm khóa</span>
                                                ) : expired ? (
                                                    <span className="badge badge-warning">Hết hạn</span>
                                                ) : (
                                                    <span className="badge badge-success">Hoạt động</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline btn-sm"
                                                        onClick={() => handleEdit(v)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(v)}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VoucherList;