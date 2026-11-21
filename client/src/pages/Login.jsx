import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [matKhau, setMatKhau] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, matKhau);
            if (user.VaiTro === 'ADMIN') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card auth-box">
            <h1 style={{ fontSize: '24px', marginBottom: '6px', textAlign: 'center' }}>Đăng nhập</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                Chào mừng bạn quay lại ShopThoiTrang
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        required
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input
                        type="password"
                        required
                        className="form-control"
                        value={matKhau}
                        onChange={(e) => setMatKhau(e.target.value)}
                        placeholder="••••••"
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Chưa có tài khoản?{' '}
                <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    Đăng ký ngay
                </Link>
            </p>
        </div>
    );
};

export default Login;