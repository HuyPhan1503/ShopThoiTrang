const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');

const productController = {
    getAllProducts: asyncHandler(async (req, res) => {
        const data = await productService.getProducts(req.query);
        res.json({
            success: true,
            data: data.items,
            pagination: data.pagination
        });
    }),

    getProductById: asyncHandler(async (req, res) => {
        const product = await productService.getProductDetail(req.params.id);
        res.json({
            success: true,
            data: product
        });
    }),

    createProduct: asyncHandler(async (req, res) => {
        const created = await productService.createProduct(req.body);
        res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công.',
            data: created
        });
    }),

    updateProduct: asyncHandler(async (req, res) => {
        const updated = await productService.updateProduct(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Cập nhật sản phẩm thành công.',
            data: updated
        });
    }),

    deleteProduct: asyncHandler(async (req, res) => {
        await productService.deleteProduct(req.params.id);
        res.json({
            success: true,
            message: 'Xóa sản phẩm thành công.'
        });
    }),

    addVariant: asyncHandler(async (req, res) => {
        const variant = await productService.addVariant(req.params.id, req.body);
        res.status(201).json({
            success: true,
            message: 'Thêm biến thể sản phẩm thành công.',
            data: variant
        });
    }),

    updateVariant: asyncHandler(async (req, res) => {
        const variant = await productService.updateVariant(req.params.variantId, req.body);
        res.json({
            success: true,
            message: 'Cập nhật biến thể thành công.',
            data: variant
        });
    }),

    deleteVariant: asyncHandler(async (req, res) => {
        await productService.deleteVariant(req.params.variantId);
        res.json({
            success: true,
            message: 'Xóa biến thể thành công.'
        });
    })
};

module.exports = productController;