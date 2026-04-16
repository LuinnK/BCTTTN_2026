const { sql, connectDB } = require('../config/dbConfig');

class BatchDAO {
    // Hàm tìm kiếm lô hàng theo chuẩn FEFO
    static async findBatchesByFEFO(sku) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
               .input('SKU', sql.VarChar, sku)
               .query(`
                    SELECT p.sku, p.name, i.bin_code, i.quantity, b.batch_no, b.expiry_date 
                    FROM Inventories i
                    JOIN Products p ON p.id = i.product_id
                    JOIN Batches b ON b.id = i.batch_id
                    WHERE p.sku = @SKU AND i.quantity > 0
                    ORDER BY b.expiry_date ASC
                `);
            
            return result.recordset;
        } catch (error) {
            throw new Error('Lỗi truy vấn lô hàng FEFO: ' + error.message);
        }
    }
}

module.exports = BatchDAO;