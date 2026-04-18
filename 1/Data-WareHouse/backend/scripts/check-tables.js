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
        const pool = await sql.connect(cfg);
        const r = await pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");
        const tables = r.recordset.map(x => x.TABLE_NAME);
        
        for (const t of ['Orders', 'OrderLines']) {
            if (tables.includes(t)) {
                console.log(`\nTable ${t}:`);
                const cols = await pool.query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${t}'`);
                console.table(cols.recordset);
            }
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();