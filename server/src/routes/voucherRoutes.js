const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { verifyToken, optionalAuth } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Khách hàng
router.get('/public', voucherController.getPublicVouchers);
router.post('/apply', optionalAuth, voucherController.applyVoucher);

// Admin
router.get('/', verifyToken, isAdmin, voucherController.getAllAdmin);
router.post('/', verifyToken, isAdmin, voucherController.createVoucher);
router.put('/:id', verifyToken, isAdmin, voucherController.updateVoucher);
router.delete('/:id', verifyToken, isAdmin, voucherController.deleteVoucher);

module.exports = router;