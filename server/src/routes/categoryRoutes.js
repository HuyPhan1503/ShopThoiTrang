const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Public
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin
router.post('/', verifyToken, isAdmin, categoryController.createCategory);
router.put('/:id', verifyToken, isAdmin, categoryController.updateCategory);
router.delete('/:id', verifyToken, isAdmin, categoryController.deleteCategory);

module.exports = router;