const { sql, connectDB } = require('../config/dbConfig');

class SalesDAO {
    // Hàm lấy tổng số lượng xuất kho theo từng tháng trong 6 tháng gần nhất
    static async getHistoricalData(sku) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
               .input('SKU', sql.VarChar, sku)
               .query(`
                    SELECT 
                        MONTH(t.created_at) as Month, 
                        YEAR(t.created_at) as Year,
                        SUM(t.quantity_changed) as TotalOutbound
                    FROM StockLogs t
                    JOIN Inventories i ON t.bin_code = i.bin_code
                    JOIN Products p ON p.id = i.product_id
                    WHERE p.sku = @SKU AND t.action_type = 'OUT'
                    AND t.created_at >= DATEADD(month, -6, GETDATE())
                    GROUP BY YEAR(t.created_at), MONTH(t.created_at)
                    ORDER BY YEAR(t.created_at) ASC, MONTH(t.created_at) ASC
                `);
            
            // Trả về mảng các con số tổng lượng xuất kho
            return result.recordset.map(record => record.TotalOutbound);
        } catch (error) {
            throw new Error('Lỗi truy xuất dữ liệu lịch sử: ' + error.message);
        }
    }
}

module.exports = SalesDAO;