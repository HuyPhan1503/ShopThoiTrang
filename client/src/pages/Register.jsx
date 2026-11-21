import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        hoTen: '',
        email: '',
        soDienThoai: '',
        matKhau: '',
        xacNhanMatKhau: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.matKhau !== form.xacNhanMatKhau) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            await register({
                hoTen: form.hoTen,
                email: form.email,
                soDienThoai: form.soDienThoai,
                matKhau: form.matKhau
            });
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card auth-box">
            <h1 style={{ fontSize: '24px', marginBottom: '6px', textAlign: 'center' }}>Đăng ký tài khoản</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                Tạo tài khoản để theo dõi đơn hàng dễ dàng
            </p>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Họ và tên *</label>
                    <input
                        type="text"
                        name="hoTen"
                        required
                        className="form-control"
                        value={form.hoTen}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                        type="email"
                        name="email"
                        required
                        className="form-control"
                        value={form.email}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                        type="tel"
                        name="soDienThoai"
                        required
                        className="form-control"
                        value={form.soDienThoai}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Mật khẩu (tối thiểu 6 ký tự) *</label>
                    <input
                        type="password"
                        name="matKhau"
                        required
                        minLength={6}
                        className="form-control"
                        value={form.matKhau}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu *</label>
                    <input
                        type="password"
                        name="xacNhanMatKhau"
                        required
                        className="form-control"
                        value={form.xacNhanMatKhau}
                        onChange={handleChange}
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Đã có tài khoản?{' '}
                <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
};

export default Register;