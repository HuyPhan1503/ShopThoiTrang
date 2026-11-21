import api from './api';

const voucherService = {
    async getPublicVouchers() {
        return await api.get('/vouchers/public');
    },

    async applyVoucher(maCode, tongTienHang) {
        return await api.post('/vouchers/apply', { maCode, tongTienHang });
    },

    async getAllAdmin() {
        return await api.get('/vouchers');
    },

    async createVoucher(payload) {
        return await api.post('/vouchers', payload);
    },

    async updateVoucher(id, payload) {
        return await api.put(`/vouchers/${id}`, payload);
    },

    async deleteVoucher(id) {
        return await api.delete(`/vouchers/${id}`);
    }
};

export default voucherService;