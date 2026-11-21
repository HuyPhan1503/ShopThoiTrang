import api from './api';

const authService = {
    async login(email, matKhau) {
        const res = await api.post('/auth/login', { email, matKhau });
        if (res.data?.token) {
            localStorage.setItem('shop_token', res.data.token);
            localStorage.setItem('shop_user', JSON.stringify(res.data.user));
        }
        return res;
    },

    async register(payload) {
        const res = await api.post('/auth/register', payload);
        if (res.data?.token) {
            localStorage.setItem('shop_token', res.data.token);
            localStorage.setItem('shop_user', JSON.stringify(res.data.user));
        }
        return res;
    },

    async getMe() {
        return await api.get('/auth/me');
    },

    async updateProfile(payload) {
        const res = await api.put('/users/profile', payload);
        if (res.data) {
            localStorage.setItem('shop_user', JSON.stringify(res.data));
        }
        return res;
    },

    async changePassword(payload) {
        return await api.put('/users/change-password', payload);
    },

    logout() {
        localStorage.removeItem('shop_token');
        localStorage.removeItem('shop_user');
    }
};

export default authService;