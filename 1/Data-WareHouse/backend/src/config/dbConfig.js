const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Cấu hình thông số kết nối SQL Server Authentication
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Hàm khởi tạo kết nối Database
const connectDB = async () => {
    try {
        const pool = await sql.connect(sqlConfig);
        console.log(' Kết nối SQL Server thành công!');
        return pool;
    } catch (error) {
        console.error(' Lỗi kết nối SQL Server:', JSON.stringify(error, null, 2));
        console.error(' Server vẫn chạy nhưng các chức năng cần DB sẽ báo lỗi.');
        return null;
    }
};

module.exports = { sql, connectDB };