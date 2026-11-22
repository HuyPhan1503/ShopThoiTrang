const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Public
router.get('/track', orderController.trackOrder);
router.post('/webhook/bank-transfer', orderController.bankTransferWebhook);

// Customer đã đăng nhập
router.post('/', verifyToken, orderController.placeOrder);
router.get('/my-orders', verifyToken, orderController.getMyOrders);
router.patch('/:id/cancel', verifyToken, orderController.cancelOrder);
router.patch('/:id/confirm-received', verifyToken, orderController.confirmReceived);
router.patch('/:id/request-refund', verifyToken, orderController.requestRefund);

// Admin & Automation
router.get('/admin/stats', verifyToken, isAdmin, orderController.getDashboardStats);
router.get('/admin/automation', verifyToken, isAdmin, orderController.getAutomationConfig);
router.put('/admin/automation', verifyToken, isAdmin, orderController.updateAutomationConfig);
router.post('/admin/automation/run-now', verifyToken, isAdmin, orderController.runAutomationNow);
router.post('/admin/automation/reconcile-transfer', verifyToken, isAdmin, orderController.reconcileTransfer);
router.patch('/admin/bulk-status', verifyToken, isAdmin, orderController.bulkUpdateStatus);

router.get('/', verifyToken, isAdmin, orderController.getAllOrders);
router.patch('/:id/ship', verifyToken, isAdmin, orderController.shipOrder);
router.patch('/:id/process-refund', verifyToken, isAdmin, orderController.processRefund);
router.patch('/:id/status', verifyToken, isAdmin, orderController.updateOrderStatus);

// Chi tiết 1 đơn hàng
router.get('/:id', verifyToken, orderController.getOrderById);

module.exports = router;