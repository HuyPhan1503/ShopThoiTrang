const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Public
router.get('/product/:productId', reviewController.getReviewsByProduct);

// Customer
router.get('/can-review/:productId', verifyToken, reviewController.checkCanReview);
router.post('/', verifyToken, reviewController.createReview);
router.delete('/:id', verifyToken, reviewController.deleteReview);

// Admin
router.get('/', verifyToken, isAdmin, reviewController.getAllReviews);
router.patch('/:id/status', verifyToken, isAdmin, reviewController.updateReviewStatus);

module.exports = router;