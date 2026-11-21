import { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('shop_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('shop_token');
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await authService.getMe();
                setUser(res.data);
                localStorage.setItem('shop_user', JSON.stringify(res.data));
            } catch {
                authService.logout();
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email, matKhau) => {
        const res = await authService.login(email, matKhau);
        setUser(res.data.user);
        return res.data.user;
    };

    const register = async (payload) => {
        const res = await authService.register(payload);
        setUser(res.data.user);
        return res.data.user;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const updateUserInfo = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('shop_user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                isAuthenticated: Boolean(user),
                isAdmin: user?.VaiTro === 'ADMIN',
                login,
                register,
                logout,
                updateUserInfo
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);