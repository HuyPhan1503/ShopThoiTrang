const mysql = require('mysql2/promise');
require('dotenv').config();

const isRemoteDb = process.env.DB_HOST && !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST);

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'ShopThoiTrangDB',
    ...(isRemoteDb || process.env.DB_SSL === 'true'
        ? { ssl: { rejectUnauthorized: false } }
        : {}),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`✅ Đã kết nối thành công tới MySQL (${process.env.DB_NAME || 'ShopThoiTrangDB'})`);
        connection.release();
    } catch (error) {
        console.error('❌ Lỗi kết nối MySQL:', error.message);
        process.exit(1);
    }
};

module.exports = {
    pool,
    connectDB
};