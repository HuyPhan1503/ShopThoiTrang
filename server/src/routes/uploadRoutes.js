const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { verifyToken } = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/adminMiddleware');
const AppError = require('../utils/AppError');

router.post('/', verifyToken, isAdmin, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new AppError('Dung lượng ảnh tối đa cho phép là 5MB.', 400));
            }
            return next(err instanceof AppError ? err : new AppError(err.message || 'Lỗi tải ảnh lên.', 400));
        }

        if (!req.file) {
            return next(new AppError('Vui lòng chọn một file ảnh để tải lên.', 400));
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.status(201).json({
            success: true,
            message: 'Tải ảnh lên thành công.',
            data: {
                filename: req.file.filename,
                url: fileUrl
            }
        });
    });
});

module.exports = router;