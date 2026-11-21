import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const Profile = () => {
    const { user, updateUserInfo } = useAuth();

    const [hoTen, setHoTen] = useState(user?.HoTen || '');
    const [soDienThoai, setSoDienThoai] = useState(user?.SoDienThoai || '');
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [savingProfile, setSavingProfile] = useState(false);

    const [matKhauCu, setMatKhauCu] = useState('');
    const [matKhauMoi, setMatKhauMoi] = useState('');
    const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
    const [passMsg, setPassMsg] = useState({ type: '', text: '' });
    const [savingPass, setSavingPass] = useState(false);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg({ type: '', text: '' });
        try {
            const res = await authService.updateProfile({ hoTen, soDienThoai });
            updateUserInfo(res.data);
            setProfileMsg({ type: 'success', text: 'Cập nhật thông tin cá nhân thành công!' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.message });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPassMsg({ type: '', text: '' });

        if (matKhauMoi !== xacNhanMatKhau) {
            setPassMsg({ type: 'error', text: 'Mật khẩu mới xác nhận không khớp.' });
            return;
        }

        setSavingPass(true);
        try {
            await authService.changePassword({ matKhauCu, matKhauMoi });
            setMatKhauCu('');
            setMatKhauMoi('');
            setXacNhanMatKhau('');
            setPassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        } catch (err) {
            setPassMsg({ type: 'error', text: err.message });
        } finally {
            setSavingPass(false);
        }
    };

    return (
        <div>
            <h1 className="section-title" style={{ marginBottom: '20px' }}>
                Hồ sơ tài khoản
            </h1>

            <div className="profile-grid">
                <div className="card">
                    <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Thông tin cá nhân</h2>
                    {profileMsg.text && (
                        <div className={`alert ${profileMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {profileMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdateProfile}>
                        <div className="form-group">
                            <label className="form-label">Email đăng nhập</label>
                            <input type="email" className="form-control" value={user?.Email || ''} disabled />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Họ và tên *</label>
                            <input
                                type="text"
                                required
                                className="form-control"
                                value={hoTen}
                                onChange={(e) => setHoTen(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Số điện thoại *</label>
                            <input
                                type="tel"
                                required
                                className="form-control"
                                value={soDienThoai}
                                onChange={(e) => setSoDienThoai(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                            {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Đổi mật khẩu</h2>
                    {passMsg.text && (
                        <div className={`alert ${passMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {passMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label className="form-label">Mật khẩu hiện tại *</label>
                            <input
                                type="password"
                                required
                                className="form-control"
                                value={matKhauCu}
                                onChange={(e) => setMatKhauCu(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới (tối thiểu 6 ký tự) *</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="form-control"
                                value={matKhauMoi}
                                onChange={(e) => setMatKhauMoi(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Xác nhận mật khẩu mới *</label>
                            <input
                                type="password"
                                required
                                className="form-control"
                                value={xacNhanMatKhau}
                                onChange={(e) => setXacNhanMatKhau(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={savingPass}>
                            {savingPass ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;