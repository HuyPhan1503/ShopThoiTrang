require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/database');
const orderAutomationService = require('./src/services/orderAutomationService');

const PORT = process.env.PORT || 5000;

// Khởi động server sau khi kết nối CSDL thành công
connectDB().then(() => {
    orderAutomationService.startScheduler();
    app.listen(PORT, () => {
        console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    });
});