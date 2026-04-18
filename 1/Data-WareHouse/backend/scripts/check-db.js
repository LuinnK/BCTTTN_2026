/**
 * Chạy: node scripts/check-db.js (từ thư mục backend)
 * Kiểm tra nhanh schema và dữ liệu mẫu — không commit thông tin nhạy cảm.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const sql = require('mssql');

const cfg = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: { encrypt: false, trustServerCertificate: true },
};

(async () => {
    try {
        await sql.connect(cfg);
        const q = async (query) => (await sql.query(query)).recordset;

        const tables = await q(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE='BASE TABLE' 
      ORDER BY TABLE_NAME
    `);
        const names = tables.map((t) => t.TABLE_NAME);
        const hasOR = names.includes('OutboundRequests');

        console.log('=== Kết nối SQL Server: OK ===');
        console.log('Database:', process.env.DB_NAME, '| Server:', process.env.DB_SERVER);
        console.log('Số bảng user:', names.length);
        console.log('Bảng OutboundRequests:', hasOR ? 'CÓ' : 'CHƯA CÓ — chạy scripts/outbound_requests.sql');

        if (hasOR) {
            const cols = await q(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'OutboundRequests'
        ORDER BY ORDINAL_POSITION
      `);
            console.log('\nCột:', cols.map((c) => `${c.COLUMN_NAME}(${c.DATA_TYPE})`).join(', '));
            const cnt = await q('SELECT COUNT(*) AS n FROM OutboundRequests');
            console.log('Số dòng OutboundRequests:', cnt[0].n);
        }

        const hasUsers = names.includes('Users');
        console.log('\nBảng Users:', hasUsers ? 'CÓ' : 'KHÔNG');
        if (hasUsers) {
            const roles = await q('SELECT DISTINCT role FROM Users');
            console.log('Giá trị role (distinct):', roles.map((r) => r.role).join(', ') || '(trống)');
            const users = await q('SELECT TOP 15 id, username, role, full_name FROM Users ORDER BY id');
            console.log('\nDanh sách Users (tối đa 15):');
            console.table(users);
        }

        await sql.close();
        process.exit(0);
    } catch (e) {
        console.error('LỖI:', e.message);
        process.exit(1);
    }
})();
