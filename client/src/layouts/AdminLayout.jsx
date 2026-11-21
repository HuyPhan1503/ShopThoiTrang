import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

const AdminLayout = () => {
    const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return <Loading text="Đang kiểm tra quyền quản trị..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="admin-shell">
            <aside className="admin-sidebar">
                <div className="admin-brand">
                    ADMIN <span style={{ color: '#f43f5e' }}>SHOP</span>
                </div>

                <nav className="admin-nav">
                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    >
                        Tổng quan (Dashboard)
                    </NavLink>
                    <NavLink
                        to="/admin/products"
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    >
                        Quản lý sản phẩm
                    </NavLink>
                    <NavLink
                        to="/admin/categories"
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    >
                        Quản lý danh mục
                    </NavLink>
                    <NavLink
                        to="/admin/orders"
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    >
                        Quản lý đơn hàng
                    </NavLink>
                    <NavLink
                        to="/admin/vouchers"
                        className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                    >
                        Quản lý mã giảm giá
                    </NavLink>
                </nav>

                <div style={{ padding: '16px', borderTop: '1px solid #1f2937' }}>
                    <Link to="/" className="btn btn-outline btn-sm" style={{ width: '100%' }}>
                        &larr; Về trang bán hàng
                    </Link>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div style={{ fontWeight: 600 }}>Hệ thống quản trị ShopThoiTrang</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '14px' }}>
                            Xin chào, <strong>{user.HoTen}</strong>
                        </span>
                        <button type="button" onClick={handleLogout} className="btn btn-outline btn-sm">
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;