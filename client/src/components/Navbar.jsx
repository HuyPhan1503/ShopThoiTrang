import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import productService from '../services/productService';

const Navbar = () => {
    const [categories, setCategories] = useState([]);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const activeCat = searchParams.get('danhMucId');

    useEffect(() => {
        productService
            .getCategories()
            .then((res) => setCategories(res.data || []))
            .catch(() => setCategories([]));
    }, []);

    return (
        <nav className="site-navbar">
            <div className="container">
                <ul className="navbar-list">
                    <li>
                        <NavLink to="/" end className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
                            Trang chủ
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/products"
                            className={`navbar-link ${location.pathname === '/products' && !activeCat ? 'active' : ''}`}
                        >
                            Tất cả sản phẩm
                        </NavLink>
                    </li>
                    {categories.map((cat) => (
                        <li key={cat.DanhMucId}>
                            <NavLink
                                to={`/products?danhMucId=${cat.DanhMucId}`}
                                className={`navbar-link ${activeCat === String(cat.DanhMucId) ? 'active' : ''}`}
                            >
                                {cat.TenDanhMuc}
                            </NavLink>
                        </li>
                    ))}
                    <li style={{ marginLeft: 'auto' }}>
                        <NavLink
                            to="/tra-cuu-don"
                            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                        >
                            Tra cứu đơn hàng
                        </NavLink>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;