const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `product-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Chỉ chấp nhận định dạng ảnh JPG, PNG, WEBP hoặc GIF.', 400), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

module.exports = upload;