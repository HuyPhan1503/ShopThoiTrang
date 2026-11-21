const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Public
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

// Admin - Quản lý Sản phẩm
router.post('/', verifyToken, isAdmin, productController.createProduct);
router.put('/:id', verifyToken, isAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, isAdmin, productController.deleteProduct);

// Admin - Quản lý Biến thể (Size / Màu / Tồn kho)
router.post('/:id/variants', verifyToken, isAdmin, productController.addVariant);
router.put('/variants/:variantId', verifyToken, isAdmin, productController.updateVariant);
router.delete('/variants/:variantId', verifyToken, isAdmin, productController.deleteVariant);

module.exports = router;