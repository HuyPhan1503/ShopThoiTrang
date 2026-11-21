import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../components/ProductCard';
import Pagination from '../../components/Pagination';
import Loading from '../../components/Loading';

const STATUS_MAP = {
    CHO_XAC_NHAN: { text: 'Chờ xác nhận', cls: 'badge-warning' },
    DA_XAC_NHAN: { text: 'Đã xác nhận', cls: 'badge-info' },
    DANG_GIAO: { text: 'Đang giao hàng', cls: 'badge-info' },
    HOAN_THANH: { text: 'Hoàn thành', cls: 'badge-success' },
    DA_HUY: { text: 'Đã hủy', cls: 'badge-danger' },
    YEU_CAU_HOAN_TIEN: { text: 'Yêu cầu hoàn tiền', cls: 'badge-warning' },
    DA_HOAN_TIEN: { text: 'Đã hoàn tiền', cls: 'badge-danger' }
};

const NEXT_STEP_ACTION = {
    CHO_XAC_NHAN: { nextStatus: 'DA_XAC_NHAN', label: 'Duyệt nhanh', bg: '#10b981' },
    DA_XAC_NHAN: { nextStatus: 'DANG_GIAO', label: 'Bàn giao ĐVVC', bg: '#2563eb' },
    DANG_GIAO: { nextStatus: 'HOAN_THANH', label: 'Hoàn thành', bg: '#059669' }
};

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [trangThai, setTrangThai] = useState('ALL');
    const [keyword, setKeyword] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [selectedIds, setSelectedIds] = useState([]);
    const [processingRowId, setProcessingRowId] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    const [showAutoPanel, setShowAutoPanel] = useState(true);
    const [autoConfig, setAutoConfig] = useState({
        autoConfirmCod: true,
        autoShipAfterPayment: true,
        defaultCarrier: 'SPX Express',
        autoCancelUnpaidHours: 24,
        autoCompleteShippingDays: 3,
        sendStatusEmails: true
    });
    const [autoBusy, setAutoBusy] = useState(false);
    const [reconcileCode, setReconcileCode] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await orderService.getAllOrders({
                page,
                limit: 15,
                trangThai: trangThai !== 'ALL' ? trangThai : undefined,
                keyword: keyword || undefined
            });
            const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
            const pag = res.pagination || res.data?.pagination || { page: 1, totalPages: 1, total: list.length };
            setOrders(list);
            setPagination(pag);
            setSelectedIds([]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAutomation = async () => {
        try {
            const res = await orderService.getAutomationConfig();
            if (res?.data?.config) setAutoConfig(res.data.config);
        } catch {
            // Bỏ qua
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, trangThai, keyword]);

    useEffect(() => {
        fetchAutomation();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setKeyword(searchInput.trim());
    };

    const handleQuickStep = async (order, nextStatus) => {
        setProcessingRowId(order.DonHangId);
        setError('');
        setNotice('');
        try {
            const res = await orderService.updateOrderStatus(order.DonHangId, nextStatus);
            const updated = res.data;
            setNotice(
                nextStatus === 'DANG_GIAO' && updated?.MaVanDon
                    ? `Đã bàn giao đơn #${order.MaDon} cho ${updated.DonViVanChuyen} (Mã vận đơn: ${updated.MaVanDon}).`
                    : `Đã cập nhật đơn #${order.MaDon} sang "${STATUS_MAP[nextStatus]?.text || nextStatus}".`
            );
            await fetchOrders();
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessingRowId(null);
        }
    };

    const allSelected = orders.length > 0 && orders.every((o) => selectedIds.includes(o.DonHangId));
    const toggleSelectAll = () => {
        if (allSelected) setSelectedIds([]);
        else setSelectedIds(orders.map((o) => o.DonHangId));
    };

    const toggleSelectRow = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const handleBulkAction = async (targetStatus) => {
        if (selectedIds.length === 0) return;
        if (
            targetStatus === 'DA_HUY' &&
            !window.confirm(`Hủy ${selectedIds.length} đơn hàng đã chọn sẽ hoàn lại tồn kho. Tiếp tục?`)
        ) {
            return;
        }

        setBulkLoading(true);
        setError('');
        setNotice('');
        try {
            const res = await orderService.bulkUpdateStatus(selectedIds, targetStatus);
            setNotice(res.message || 'Đã xử lý hàng loạt.');
            await fetchOrders();
        } catch (err) {
            setError(err.message);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleSaveAutoConfig = async (nextPartial) => {
        const merged = { ...autoConfig, ...nextPartial };
        setAutoConfig(merged);
        setAutoBusy(true);
        try {
            const res = await orderService.updateAutomationConfig(merged);
            if (res?.data?.config) setAutoConfig(res.data.config);
            setNotice('Đã cập nhật quy tắc tự động hóa đơn hàng.');
        } catch (err) {
            setError(err.message);
        } finally {
            setAutoBusy(false);
        }
    };

    const handleRunAutoNow = async () => {
        setAutoBusy(true);
        setError('');
        setNotice('');
        try {
            const res = await orderService.runAutomationNow();
            setNotice(res.message);
            await fetchOrders();
        } catch (err) {
            setError(err.message);
        } finally {
            setAutoBusy(false);
        }
    };

    const handleReconcileTransfer = async (e) => {
        e.preventDefault();
        setAutoBusy(true);
        setError('');
        setNotice('');
        try {
            const res = await orderService.reconcileTransfer(reconcileCode);
            setNotice(res.message);
            setReconcileCode('');
            await fetchOrders();
        } catch (err) {
            setError(err.message);
        } finally {
            setAutoBusy(false);
        }
    };

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Quản lý đơn hàng ({pagination.total})</h1>
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAutoPanel((v) => !v)}
                >
                    {showAutoPanel ? 'Ẩn cấu hình tự động' : '⚙️ Cấu hình tự động duyệt đơn'}
                </button>
            </div>

            {showAutoPanel && (
                <div className="card" style={{ marginBottom: '16px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                                Tự động hóa quy trình xử lý đơn hàng
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                                Tự động duyệt COD, đối soát chuyển khoản VietQR, cấp mã vận đơn ĐVVC và quét đơn quá hạn định kỳ
                            </div>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" disabled={autoBusy} onClick={handleRunAutoNow}>
                            {autoBusy ? 'Đang chạy...' : '⚡ Chạy tác vụ tự động ngay'}
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoConfig.autoConfirmCod} disabled={autoBusy} onChange={(e) => handleSaveAutoConfig({ autoConfirmCod: e.target.checked })} />
                            <span><strong>Tự duyệt đơn COD</strong> ngay khi khách đặt</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={autoConfig.sendStatusEmails} disabled={autoBusy} onChange={(e) => handleSaveAutoConfig({ sendStatusEmails: e.target.checked })} />
                            <span><strong>Gửi Email tự động</strong> khi đổi trạng thái</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <span>Tự hủy đơn CK treo sau (giờ):</span>
                            <input type="number" min="0" max="720" value={autoConfig.autoCancelUnpaidHours}
                                onChange={(e) => setAutoConfig((prev) => ({ ...prev, autoCancelUnpaidHours: Number(e.target.value) }))}
                                onBlur={(e) => handleSaveAutoConfig({ autoCancelUnpaidHours: Number(e.target.value) })}
                                style={{ width: '64px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <span>Tự hoàn thành sau giao (ngày):</span>
                            <input type="number" min="0" max="90" value={autoConfig.autoCompleteShippingDays}
                                onChange={(e) => setAutoConfig((prev) => ({ ...prev, autoCompleteShippingDays: Number(e.target.value) }))}
                                onBlur={(e) => handleSaveAutoConfig({ autoCompleteShippingDays: Number(e.target.value) })}
                                style={{ width: '64px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                        </div>
                    </div>

                    <form onSubmit={handleReconcileTransfer} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>🏦 Đối soát chuyển khoản VietQR (Webhook):</span>
                        <input type="text" className="form-control" style={{ maxWidth: '250px', padding: '6px 10px', fontSize: '13px' }}
                            placeholder="Nhập mã đơn (để trống = duyệt tất cả đơn CK)" value={reconcileCode} onChange={(e) => setReconcileCode(e.target.value)} />
                        <button type="submit" disabled={autoBusy} style={{ border: 'none', borderRadius: '6px', background: '#0284c7', color: '#fff', padding: '7px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            Xác nhận đã nhận tiền & Tự duyệt
                        </button>
                    </form>
                </div>
            )}

            {/* Tabs lọc nhanh trạng thái */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[
                    { value: 'ALL', label: 'Tất cả' },
                    { value: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
                    { value: 'DA_XAC_NHAN', label: 'Chờ bàn giao ĐVVC' },
                    { value: 'DANG_GIAO', label: 'Đang giao hàng' },
                    { value: 'HOAN_THANH', label: 'Hoàn thành' },
                    { value: 'YEU_CAU_HOAN_TIEN', label: 'Yêu cầu hoàn tiền' },
                    { value: 'DA_HOAN_TIEN', label: 'Đã hoàn tiền' },
                    { value: 'DA_HUY', label: 'Đã hủy' }
                ].map((tab) => (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                            setPage(1);
                            setTrangThai(tab.value);
                        }}
                        className={`btn btn-sm ${trangThai === tab.value ? 'btn-primary' : 'btn-outline'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <form className="filter-bar" onSubmit={handleSearch}>
                <div>
                    <label className="form-label">Tìm kiếm (Mã đơn / Mã vận đơn / Tên / SĐT)</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="DH000013, SPX..., tên khách hoặc SĐT..."
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
                            setTrangThai('ALL');
                            setPage(1);
                        }}
                    >
                        Đặt lại
                    </button>
                </div>
            </form>

            {notice && <div className="alert alert-success">{notice}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {selectedIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: '10px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600 }}>
                        Đã chọn <span style={{ color: '#38bdf8' }}>{selectedIds.length}</span> đơn hàng
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction('DA_XAC_NHAN')}
                            style={{ border: 'none', borderRadius: '6px', background: '#10b981', color: '#fff', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                            ✓ Duyệt hàng loạt
                        </button>
                        <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction('DANG_GIAO')}
                            style={{ border: 'none', borderRadius: '6px', background: '#3b82f6', color: '#fff', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                            🚚 Bàn giao ĐVVC hàng loạt
                        </button>
                        <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction('HOAN_THANH')}
                            style={{ border: 'none', borderRadius: '6px', background: '#059669', color: '#fff', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                            ★ Hoàn thành hàng loạt
                        </button>
                        <button type="button" disabled={bulkLoading} onClick={() => handleBulkAction('DA_HUY')}
                            style={{ border: 'none', borderRadius: '6px', background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                            ✕ Hủy hàng loạt
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <Loading />
            ) : (
                <>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '36px' }}>
                                        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Chọn tất cả trang này" />
                                    </th>
                                    <th>Mã đơn / Vận đơn</th>
                                    <th>Ngày đặt</th>
                                    <th>Khách nhận hàng</th>
                                    <th>Thanh toán</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                            Không có đơn hàng nào phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => {
                                        const st = STATUS_MAP[order.TrangThai] || { text: order.TrangThai, cls: 'badge-gray' };
                                        const nextAction = NEXT_STEP_ACTION[order.TrangThai];
                                        const isChecked = selectedIds.includes(order.DonHangId);

                                        return (
                                            <tr key={order.DonHangId} style={{ background: isChecked ? '#f0f9ff' : undefined }}>
                                                <td>
                                                    <input type="checkbox" checked={isChecked} onChange={() => toggleSelectRow(order.DonHangId)} />
                                                </td>
                                                <td>
                                                    <Link to={`/admin/orders/${order.DonHangId}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                        {order.MaDon}
                                                    </Link>
                                                    {order.MaVanDon && (
                                                        <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                                                            🚚 {order.DonViVanChuyen}: {order.MaVanDon}
                                                        </div>
                                                    )}
                                                    {order.TrangThai === 'DA_XAC_NHAN' && order.HanChuanBi && (
                                                        <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
                                                            ⏳ Hạn giao: {new Date(order.HanChuanBi).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{new Date(order.NgayDat).toLocaleString('vi-VN')}</td>
                                                <td>
                                                    <div><strong>{order.HoTenNhan}</strong></div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.SdtNhan}</div>
                                                </td>
                                                <td>{order.PhuongThucThanhToan}</td>
                                                <td style={{ fontWeight: 700 }}>{formatCurrency(order.TongTien)}</td>
                                                <td>
                                                    <span className={`badge ${st.cls}`}>{st.text}</span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {nextAction && (
                                                            <button
                                                                type="button"
                                                                disabled={processingRowId === order.DonHangId}
                                                                onClick={() => handleQuickStep(order, nextAction.nextStatus)}
                                                                style={{
                                                                    border: 'none', borderRadius: '6px', background: nextAction.bg,
                                                                    color: '#fff', padding: '5px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                                                }}
                                                            >
                                                                {processingRowId === order.DonHangId ? '...' : nextAction.label}
                                                            </button>
                                                        )}
                                                        <Link to={`/admin/orders/${order.DonHangId}`} className="btn btn-outline btn-sm">
                                                            {order.TrangThai === 'YEU_CAU_HOAN_TIEN' ? 'Xử lý hoàn tiền' : 'Chi tiết'}
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
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

export default OrderList;