import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import { formatCurrency } from '../components/ProductCard';
import Loading from '../components/Loading';

const STATUS_META = {
    CHO_XAC_NHAN: { text: 'Chờ xác nhận', cls: 'badge-warning', color: '#f59e0b' },
    DA_XAC_NHAN: { text: 'Đã xác nhận', cls: 'badge-info', color: '#3b82f6' },
    DANG_GIAO: { text: 'Đang giao hàng', cls: 'badge-info', color: '#8b5cf6' },
    HOAN_THANH: { text: 'Hoàn thành', cls: 'badge-success', color: '#10b981' },
    DA_HUY: { text: 'Đã hủy', cls: 'badge-danger', color: '#ef4444' }
};

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const resolveImg = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};

const formatCompactVnd = (val) => {
    const num = Number(val) || 0;
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
    if (num >= 1_000) return `${Math.round(num / 1_000)}k`;
    return `${num}`;
};

const RevenueChart = ({ data, metric }) => {
    const [hoveredIdx, setHoveredIdx] = useState(null);

    if (!data || data.length === 0) {
        return <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chưa có dữ liệu doanh thu.</p>;
    }

    const values = data.map((d) => (metric === 'HOAN_THANH' ? d.doanhThuHoanThanh : d.doanhThuHopLe));
    const maxVal = Math.max(...values, 100000);
    const totalPeriod = values.reduce((a, b) => a + b, 0);
    const totalOrdersPeriod = data.reduce(
        (sum, d) => sum + (metric === 'HOAN_THANH' ? d.donHoanThanh : d.tongDon),
        0
    );

    const width = 760;
    const height = 270;
    const padLeft = 62;
    const padRight = 18;
    const padTop = 20;
    const padBottom = 38;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const yTicks = [0, 0.25, 0.5, 0.75, 1];
    const stepX = plotW / data.length;
    const barW = Math.max(6, Math.min(34, stepX * 0.58));

    const labelStep = data.length > 15 ? 4 : data.length > 10 ? 2 : 1;
    const barColor = metric === 'HOAN_THANH' ? '#10b981' : '#2563eb';
    const barHoverColor = metric === 'HOAN_THANH' ? '#059669' : '#1d4ed8';

    const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;
    const hoveredValue = hoveredIdx !== null ? values[hoveredIdx] : 0;

    return (
        <div>
            {/* Thanh tóm tắt kỳ đang chọn */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '18px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    fontSize: '13px'
                }}
            >
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Tổng doanh thu kỳ này: </span>
                        <strong style={{ color: barColor, fontSize: '15px' }}>
                            {formatCurrency(totalPeriod)}
                        </strong>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)' }}>Số đơn ghi nhận: </span>
                        <strong>{totalOrdersPeriod} đơn</strong>
                    </div>
                </div>
                {hoveredItem ? (
                    <div style={{ color: '#0f172a', fontWeight: 500 }}>
                        <span>{hoveredItem.fullLabel}: </span>
                        <strong style={{ color: barHoverColor }}>{formatCurrency(hoveredValue)}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                            {' '}
                            ({metric === 'HOAN_THANH' ? hoveredItem.donHoanThanh : hoveredItem.tongDon} đơn)
                        </span>
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Di chuột vào cột để xem chi tiết từng mốc
                    </div>
                )}
            </div>

            {/* Biểu đồ cột SVG */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    style={{ width: '100%', minWidth: '520px', height: 'auto', display: 'block' }}
                >
                    {/* Đường lưới ngang & nhãn trục Y */}
                    {yTicks.map((t, i) => {
                        const y = padTop + plotH - t * plotH;
                        const tickVal = Math.round(maxVal * t);
                        return (
                            <g key={i}>
                                <line
                                    x1={padLeft}
                                    y1={y}
                                    x2={width - padRight}
                                    y2={y}
                                    stroke={t === 0 ? '#cbd5e1' : '#e2e8f0'}
                                    strokeDasharray={t === 0 ? undefined : '4 4'}
                                />
                                <text
                                    x={padLeft - 8}
                                    y={y + 4}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="#64748b"
                                >
                                    {formatCompactVnd(tickVal)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Các cột dữ liệu */}
                    {data.map((item, idx) => {
                        const val = values[idx];
                        const barH = val > 0 ? Math.max(4, (val / maxVal) * plotH) : 0;
                        const xCenter = padLeft + idx * stepX + stepX / 2;
                        const xBar = xCenter - barW / 2;
                        const yBar = padTop + plotH - barH;
                        const isHovered = hoveredIdx === idx;
                        const showXLabel = idx % labelStep === 0 || idx === data.length - 1;

                        return (
                            <g
                                key={item.key}
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                            >
                                {/* Vùng nhận hover rộng toàn cột */}
                                <rect
                                    x={padLeft + idx * stepX}
                                    y={padTop}
                                    width={stepX}
                                    height={plotH}
                                    fill={isHovered ? 'rgba(148, 163, 184, 0.12)' : 'transparent'}
                                />

                                {/* Cột doanh thu */}
                                {barH > 0 ? (
                                    <rect
                                        x={xBar}
                                        y={yBar}
                                        width={barW}
                                        height={barH}
                                        rx={Math.min(5, barW / 2)}
                                        fill={isHovered ? barHoverColor : barColor}
                                        style={{ transition: 'fill 0.15s ease' }}
                                    />
                                ) : (
                                    <line
                                        x1={xBar}
                                        y1={padTop + plotH - 1}
                                        x2={xBar + barW}
                                        y2={padTop + plotH - 1}
                                        stroke="#cbd5e1"
                                        strokeWidth="2"
                                    />
                                )}

                                {/* Nhãn giá trị trên đầu cột khi hover */}
                                {isHovered && val > 0 && (
                                    <text
                                        x={xCenter}
                                        y={Math.max(13, yBar - 6)}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight="700"
                                        fill="#0f172a"
                                    >
                                        {formatCompactVnd(val)}
                                    </text>
                                )}

                                {/* Nhãn trục X */}
                                {showXLabel && (
                                    <text
                                        x={xCenter}
                                        y={padTop + plotH + 20}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fontWeight={isHovered ? '700' : '400'}
                                        fill={isHovered ? '#0f172a' : '#64748b'}
                                    >
                                        {item.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

const StatusDonutChart = ({ rows }) => {
    const [hoveredStatus, setHoveredStatus] = useState(null);

    const normalized = (rows || []).map((r) => {
        const key = r.TrangThai;
        const meta = STATUS_META[key] || { text: key, cls: 'badge-gray', color: '#94a3b8' };
        const count = Number(r.SoLuongDon ?? r.SoDon ?? r.TongSoDon ?? 0);
        const amount = Number(r.DoanhThu ?? 0);
        return { key, ...meta, count, amount };
    });

    const total = normalized.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
        return <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chưa có dữ liệu đơn hàng.</p>;
    }

    const size = 190;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulative = 0;
    const segments = normalized
        .filter((item) => item.count > 0)
        .map((item) => {
            const pct = item.count / total;
            const dash = pct * circumference;
            const offset = -cumulative * circumference;
            cumulative += pct;
            return { ...item, pct, dash, offset };
        });

    const activeItem = segments.find((s) => s.key === hoveredStatus) || null;

    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            {/* Vòng tròn Donut */}
            <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth={strokeWidth}
                    />
                    <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                        {segments.map((seg) => {
                            const isHovered = hoveredStatus === seg.key;
                            return (
                                <circle
                                    key={seg.key}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                                    strokeDasharray={`${seg.dash} ${circumference}`}
                                    strokeDashoffset={seg.offset}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'stroke-width 0.15s ease, opacity 0.15s ease',
                                        opacity: hoveredStatus && !isHovered ? 0.55 : 1
                                    }}
                                    onMouseEnter={() => setHoveredStatus(seg.key)}
                                    onMouseLeave={() => setHoveredStatus(null)}
                                />
                            );
                        })}
                    </g>
                </svg>

                {/* Nhãn trung tâm Donut */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        padding: '0 24px'
                    }}
                >
                    <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>
                        {activeItem ? `${(activeItem.pct * 100).toFixed(0)}%` : total}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {activeItem ? activeItem.text : 'Tổng đơn hàng'}
                    </div>
                </div>
            </div>

            {/* Bảng chú thích tỷ lệ */}
            <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {normalized.map((item) => {
                    const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
                    const isHovered = hoveredStatus === item.key;
                    return (
                        <div
                            key={item.key}
                            onMouseEnter={() => setHoveredStatus(item.key)}
                            onMouseLeave={() => setHoveredStatus(null)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: isHovered ? '#f1f5f9' : '#f8fafc',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: item.color,
                                        flexShrink: 0
                                    }}
                                />
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.text}</span>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '13px' }}>
                                <strong>{item.count}</strong> đơn{' '}
                                <span style={{ color: 'var(--text-muted)' }}>({pct}%)</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('7D'); // '7D' | '30D' | '12M'
    const [revenueMetric, setRevenueMetric] = useState('HOAN_THANH'); // 'HOAN_THANH' | 'HOP_LE'

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await orderService.getDashboardStats();
                setStats(res.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loading text="Đang tải thống kê..." />;
    if (error) return <div className="alert alert-error">{error}</div>;

    const tongQuan = stats?.tongQuan || {};
    const donTheoTrangThai = stats?.donTheoTrangThai || [];
    const sapHetHang = stats?.sapHetHang || [];
    const doanhThuTheoNgay = stats?.doanhThuTheoNgay || [];
    const doanhThuTheoThang = stats?.doanhThuTheoThang || [];
    const topSanPhamBanChay = stats?.topSanPhamBanChay || [];

    const chartData =
        period === '7D'
            ? doanhThuTheoNgay.slice(-7)
            : period === '30D'
              ? doanhThuTheoNgay
              : doanhThuTheoThang;

    const maxSold = topSanPhamBanChay.reduce((max, p) => Math.max(max, p.TongDaBan || 0), 1);

    return (
        <div>
            <div className="section-header">
                <h1 className="section-title">Tổng quan hệ thống</h1>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to="/admin/products/add" className="btn btn-primary btn-sm">
                        + Thêm sản phẩm
                    </Link>
                    <Link to="/admin/orders" className="btn btn-outline btn-sm">
                        Xem đơn hàng
                    </Link>
                </div>
            </div>

            {/* 4 thẻ chỉ số tổng quan */}
            <div className="stat-grid">
                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Doanh thu hoàn thành
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)' }}>
                        {formatCurrency(tongQuan.DoanhThu || 0)}
                    </div>
                </div>

                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Tổng đơn hàng
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{tongQuan.TongDonHang ?? 0}</div>
                </div>

                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Tổng sản phẩm
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{tongQuan.TongSanPham ?? 0}</div>
                </div>

                <div className="card">
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Khách hàng thành viên
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{tongQuan.TongKhachHang ?? 0}</div>
                </div>
            </div>

            {/* Biểu đồ doanh thu theo ngày / tháng */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px'
                    }}
                >
                    <div>
                        <h2 style={{ fontSize: '17px', marginBottom: '2px' }}>
                            Biểu đồ thống kê doanh thu
                        </h2>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Theo dõi biến động doanh thu theo ngày và theo tháng
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Chuyển đổi nguồn doanh thu */}
                        <div
                            style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                padding: '3px',
                                borderRadius: '8px'
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setRevenueMetric('HOAN_THANH')}
                                style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: revenueMetric === 'HOAN_THANH' ? '#ffffff' : 'transparent',
                                    color: revenueMetric === 'HOAN_THANH' ? '#059669' : '#64748b',
                                    boxShadow:
                                        revenueMetric === 'HOAN_THANH'
                                            ? '0 1px 2px rgba(0,0,0,0.08)'
                                            : 'none'
                                }}
                            >
                                Đơn hoàn thành
                            </button>
                            <button
                                type="button"
                                onClick={() => setRevenueMetric('HOP_LE')}
                                style={{
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: revenueMetric === 'HOP_LE' ? '#ffffff' : 'transparent',
                                    color: revenueMetric === 'HOP_LE' ? '#2563eb' : '#64748b',
                                    boxShadow:
                                        revenueMetric === 'HOP_LE'
                                            ? '0 1px 2px rgba(0,0,0,0.08)'
                                            : 'none'
                                }}
                            >
                                Tất cả đơn chưa hủy
                            </button>
                        </div>

                        {/* Chuyển đổi mốc thời gian */}
                        <div
                            style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                padding: '3px',
                                borderRadius: '8px'
                            }}
                        >
                            {[
                                { id: '7D', label: '7 ngày' },
                                { id: '30D', label: '30 ngày' },
                                { id: '12M', label: '12 tháng' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setPeriod(tab.id)}
                                    style={{
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '5px 11px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: period === tab.id ? '#0f172a' : 'transparent',
                                        color: period === tab.id ? '#ffffff' : '#475569'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <RevenueChart data={chartData} metric={revenueMetric} />
            </div>

            {/* Hàng 2: Tỷ lệ đơn hàng theo trạng thái & Top sản phẩm bán chạy */}
            <div className="profile-grid" style={{ marginBottom: '20px' }}>
                <div className="card">
                    <h2 style={{ fontSize: '17px', marginBottom: '4px' }}>
                        Tỷ lệ đơn hàng theo trạng thái
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Phân bổ trạng thái xử lý trên toàn bộ đơn hàng
                    </p>
                    <StatusDonutChart rows={donTheoTrangThai} />
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '17px', marginBottom: '4px' }}>Top sản phẩm bán chạy</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        Xếp hạng theo số lượng đã bán (không tính đơn đã hủy)
                    </p>

                    {topSanPhamBanChay.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            Chưa có dữ liệu bán hàng.
                        </p>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '44px' }}>#</th>
                                        <th>Sản phẩm</th>
                                        <th>Đã bán</th>
                                        <th style={{ textAlign: 'right' }}>Doanh thu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topSanPhamBanChay.map((sp, idx) => {
                                        const rankColors = ['#f59e0b', '#64748b', '#b45309'];
                                        const rankBg = idx < 3 ? rankColors[idx] : '#e2e8f0';
                                        const rankText = idx < 3 ? '#ffffff' : '#334155';
                                        const barPct = Math.round((sp.TongDaBan / maxSold) * 100);

                                        return (
                                            <tr key={sp.SanPhamId}>
                                                <td>
                                                    <span
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            background: rankBg,
                                                            color: rankText
                                                        }}
                                                    >
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px'
                                                        }}
                                                    >
                                                        {sp.AnhUrl ? (
                                                            <img
                                                                src={resolveImg(sp.AnhUrl)}
                                                                alt={sp.TenSanPham}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                                style={{
                                                                    width: '38px',
                                                                    height: '38px',
                                                                    borderRadius: '6px',
                                                                    objectFit: 'cover',
                                                                    border: '1px solid #e2e8f0',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div>
                                                            <Link
                                                                to={`/admin/products/edit/${sp.SanPhamId}`}
                                                                style={{
                                                                    fontWeight: 600,
                                                                    display: 'block',
                                                                    lineHeight: 1.3
                                                                }}
                                                            >
                                                                {sp.TenSanPham}
                                                            </Link>
                                                            <span
                                                                style={{
                                                                    fontSize: '12px',
                                                                    color: 'var(--text-muted)'
                                                                }}
                                                            >
                                                                {sp.TenDanhMuc || 'Thời trang'} • {sp.SoDonHang} đơn
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ minWidth: '110px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                                        {sp.TongDaBan} sp
                                                    </div>
                                                    <div
                                                        style={{
                                                            height: '5px',
                                                            background: '#e2e8f0',
                                                            borderRadius: '999px',
                                                            overflow: 'hidden',
                                                            marginTop: '4px'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${barPct}%`,
                                                                height: '100%',
                                                                background: '#10b981'
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td
                                                    style={{
                                                        textAlign: 'right',
                                                        fontWeight: 700,
                                                        color: 'var(--accent)',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {formatCurrency(sp.DoanhThuSanPham)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Hàng 3: Cảnh báo biến thể sắp hết hàng */}
            <div className="card">
                <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>
                    Cảnh báo sắp hết hàng (Tồn &le; 5)
                </h2>
                {sapHetHang.length === 0 ? (
                    <p style={{ color: 'var(--success)', fontSize: '14px' }}>
                        Tất cả biến thể đều còn đủ tồn kho.
                    </p>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>Size / Màu</th>
                                    <th>Tồn kho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sapHetHang.map((item) => (
                                    <tr key={item.BienTheId}>
                                        <td>
                                            <Link
                                                to={`/admin/products/edit/${item.SanPhamId}`}
                                                style={{ fontWeight: 600 }}
                                            >
                                                {item.TenSanPham}
                                            </Link>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                {item.Sku}
                                            </div>
                                        </td>
                                        <td>
                                            {item.Size} - {item.Mau}
                                        </td>
                                        <td>
                                            <span className="badge badge-danger">{item.SoLuongTon}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;