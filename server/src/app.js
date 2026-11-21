const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const faqRoutes = require('./routes/faqRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const chatRoutes = require('./routes/chatRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const AppError = require('./utils/AppError');

const app = express();

app.use(cors());
app.use(express.json());

// Mở thư mục tĩnh chứa ảnh sản phẩm đã upload
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'API ShopThoiTrang đang hoạt động!' });
});

// Bắt lỗi route không tồn tại
app.use((req, res, next) => {
    next(new AppError(`Không tìm thấy đường dẫn ${req.originalUrl}`, 404));
});

// Middleware xử lý lỗi tập trung
app.use(errorMiddleware);

module.exports = app;