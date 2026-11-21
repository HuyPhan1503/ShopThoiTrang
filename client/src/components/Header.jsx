import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Navbar from './Navbar';

const Header = () => {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { totalItems } = useCart();
    const [keyword, setKeyword] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e) => {
        e.preventDefault();
        const trimmed = keyword.trim();
        if (trimmed) {
            navigate(`/products?keyword=${encodeURIComponent(trimmed)}`);
        } else {
            navigate('/products');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="site-header">
            <div className="container header-top">
                <Link to="/" className="brand-logo">
                    SHOP<span>THOITRANG</span>
                </Link>

                <form className="header-search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Tìm áo thun, quần jean, váy đầm..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        Tìm
                    </button>
                </form>

                <div className="header-actions">
                    <Link to="/cart" className="cart-btn">
                        <span>Giỏ hàng</span>
                        <span className="cart-badge">{totalItems}</span>
                    </Link>

                    {isAuthenticated ? (
                        <>
                            {isAdmin && (
                                <Link to="/admin" className="btn btn-accent btn-sm">
                                    Quản trị
                                </Link>
                            )}
                            <Link to="/my-orders" className="btn btn-outline btn-sm">
                                Đơn của tôi
                            </Link>
                            <Link to="/profile" style={{ fontWeight: 600 }}>
                                {user.HoTen}
                            </Link>
                            <button type="button" onClick={handleLogout} className="btn btn-outline btn-sm">
                                Thoát
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-outline btn-sm">
                                Đăng nhập
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Đăng ký
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <Navbar />
        </header>
    );
};

export default Header;