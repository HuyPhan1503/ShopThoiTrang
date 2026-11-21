const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Khách hàng đã đăng nhập
router.put('/profile', verifyToken, userController.updateProfile);
router.put('/change-password', verifyToken, userController.changePassword);

// Quản trị viên
router.get('/', verifyToken, isAdmin, userController.getAllUsers);
router.patch('/:id/role', verifyToken, isAdmin, userController.updateUserRole);

module.exports = router;