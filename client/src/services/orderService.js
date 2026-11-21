import api from './api';

const orderService = {
    async placeOrder(payload) {
        return await api.post('/orders', payload);
    },

    async trackOrder(maDon, soDienThoai) {
        return await api.get('/orders/track', {
            params: { maDon, soDienThoai }
        });
    },

    async getMyOrders() {
        return await api.get('/orders/my-orders');
    },

    async getOrderById(id) {
        return await api.get(`/orders/${id}`);
    },

    async cancelOrder(id) {
        return await api.patch(`/orders/${id}/cancel`);
    },

    async confirmReceived(id) {
        return await api.patch(`/orders/${id}/confirm-received`);
    },

    async requestRefund(id, lyDoHoanTien) {
        return await api.patch(`/orders/${id}/request-refund`, { lyDoHoanTien });
    },

    // Admin & Automation
    async getAllOrders(params = {}) {
        return await api.get('/orders', { params });
    },

    async shipOrder(id, payload) {
        return await api.patch(`/orders/${id}/ship`, payload);
    },

    async processRefund(id, payload) {
        return await api.patch(`/orders/${id}/process-refund`, payload);
    },

    async updateOrderStatus(id, trangThai) {
        return await api.patch(`/orders/${id}/status`, { trangThai });
    },

    async bulkUpdateStatus(ids, trangThai) {
        return await api.patch('/orders/admin/bulk-status', { ids, trangThai });
    },

    async getDashboardStats() {
        return await api.get('/orders/admin/stats');
    },

    async getAutomationConfig() {
        return await api.get('/orders/admin/automation');
    },

    async updateAutomationConfig(payload) {
        return await api.put('/orders/admin/automation', payload);
    },

    async runAutomationNow() {
        return await api.post('/orders/admin/automation/run-now');
    },

    async reconcileTransfer(maDon = '') {
        return await api.post('/orders/admin/automation/reconcile-transfer', { maDon });
    }
};

export default orderService;