import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Tự động gắn Bearer Token vào mọi request nếu đã đăng nhập
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('shop_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Chuẩn hóa lỗi trả về từ Backend
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message =
            error.response?.data?.message ||
            error.message ||
            'Có lỗi xảy ra khi kết nối đến máy chủ.';

        if (error.response?.status === 401) {
            localStorage.removeItem('shop_token');
            localStorage.removeItem('shop_user');
        }

        return Promise.reject(new Error(message));
    }
);

export default api;