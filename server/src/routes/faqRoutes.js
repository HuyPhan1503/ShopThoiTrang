const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');

// Public
router.get('/', faqController.getAllFaqs);
router.get('/:id', faqController.getFaqById);

// Admin
router.post('/', verifyToken, isAdmin, faqController.createFaq);
router.put('/:id', verifyToken, isAdmin, faqController.updateFaq);
router.delete('/:id', verifyToken, isAdmin, faqController.deleteFaq);

module.exports = router;