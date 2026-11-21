import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

// Customer Pages
import Home from '../pages/Home';
import Products from '../pages/Products';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import TraCuuDon from '../pages/TraCuuDon';
import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import OrderDetail from '../pages/OrderDetail';

// Admin Pages
import Dashboard from '../admin/Dashboard';
import ProductList from '../admin/Products/ProductList';
import ProductAdd from '../admin/Products/ProductAdd';
import ProductEdit from '../admin/Products/ProductEdit';
import CategoryList from '../admin/Categories/CategoryList';
import CategoryForm from '../admin/Categories/CategoryForm';
import OrderList from '../admin/Orders/OrderList';
import AdminOrderDetail from '../admin/Orders/OrderDetail';
import VoucherList from '../admin/Vouchers/VoucherList';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <Loading />;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
    return (
        <Routes>
            {/* Giao diện khách hàng */}
            <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/tra-cuu-don" element={<TraCuuDon />} />

                {/* Tài khoản thành viên */}
                <Route
                    path="/profile"
                    element={
                        <PrivateRoute>
                            <Profile />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/my-orders"
                    element={
                        <PrivateRoute>
                            <MyOrders />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/orders/:id"
                    element={
                        <PrivateRoute>
                            <OrderDetail />
                        </PrivateRoute>
                    }
                />
            </Route>

            {/* Giao diện quản trị Admin */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/add" element={<ProductAdd />} />
                <Route path="products/edit/:id" element={<ProductEdit />} />
                <Route path="categories" element={<CategoryList />} />
                <Route path="categories/add" element={<CategoryForm />} />
                <Route path="categories/edit/:id" element={<CategoryForm />} />
                <Route path="orders" element={<OrderList />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="vouchers" element={<VoucherList />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;