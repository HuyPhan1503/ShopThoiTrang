import api from './api';

const productService = {
    // Sản phẩm
    async getProducts(params = {}) {
        return await api.get('/products', { params });
    },

    async getProductById(id) {
        return await api.get(`/products/${id}`);
    },

    async createProduct(payload) {
        return await api.post('/products', payload);
    },

    async updateProduct(id, payload) {
        return await api.put(`/products/${id}`, payload);
    },

    async deleteProduct(id) {
        return await api.delete(`/products/${id}`);
    },

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        return await api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    // Biến thể (Size / Màu / Tồn kho)
    async addVariant(productId, payload) {
        return await api.post(`/products/${productId}/variants`, payload);
    },

    async updateVariant(variantId, payload) {
        return await api.put(`/products/variants/${variantId}`, payload);
    },

    async deleteVariant(variantId) {
        return await api.delete(`/products/variants/${variantId}`);
    },

    // Danh mục
    async getCategories() {
        return await api.get('/categories');
    },

    async getCategoryById(id) {
        return await api.get(`/categories/${id}`);
    },

    async createCategory(payload) {
        return await api.post('/categories', payload);
    },

    async updateCategory(id, payload) {
        return await api.put(`/categories/${id}`, payload);
    },

    async deleteCategory(id) {
        return await api.delete(`/categories/${id}`);
    },

    // Đánh giá & FAQ
    async getReviewsByProduct(productId) {
        return await api.get(`/reviews/product/${productId}`);
    },

    async checkCanReview(productId) {
        return await api.get(`/reviews/can-review/${productId}`);
    },

    async createReview(payload) {
        return await api.post('/reviews', payload);
    },

    async getFaqs(params = {}) {
        return await api.get('/faqs', { params });
    }
};

export default productService;