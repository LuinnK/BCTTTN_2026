const { sql, connectDB } = require('../config/dbConfig');

class AdjustmentDAO {
    static async processInventoryAdjustment(auditData, userId) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            // Bước 1: Ghi log kiểm kê vào bảng AuditLogs
            await request
               .input('BinCode', sql.VarChar, auditData.binCode)
               .input('SKU', sql.VarChar, auditData.sku)
               .input('ExpectedQty', sql.Int, auditData.expectedQty)
               .input('ActualQty', sql.Int, auditData.actualQty)
               .input('UserId', sql.Int, userId)
               .input('Reason', sql.NVarChar, auditData.reason || 'Kiểm kê định kỳ')
               .query(`
                    INSERT INTO AuditLogs (bin_code, sku, expected_qty, actual_qty, user_id, reason, created_at)
                    VALUES (@BinCode, @SKU, @ExpectedQty, @ActualQty, @UserId, @Reason, GETDATE())
                `);

            // Bước 2: Cập nhật số dư thực tế vào bảng Inventories (Sửa sai lệch)
            await request
               .input('BinCodeUpdate', sql.VarChar, auditData.binCode)
               .input('SKUUpdate', sql.VarChar, auditData.sku)
               .input('ActualQtyUpdate', sql.Int, auditData.actualQty)
               .query(`
                    UPDATE i
                    SET i.quantity = @ActualQtyUpdate
                    FROM Inventories i
                    JOIN Products p ON p.id = i.product_id
                    WHERE i.bin_code = @BinCodeUpdate AND p.sku = @SKUUpdate
                `);

            // Bước 3: Ghi log biến động vào StockLogs (Loại giao dịch: ADJUST)
            const diff = auditData.actualQty - auditData.expectedQty;
            await request
               .input('BinCodeLog', sql.VarChar, auditData.binCode)
               .input('Diff', sql.Int, diff)
               .query(`
                    INSERT INTO StockLogs (bin_code, action_type, quantity_changed, created_at)
                    VALUES (@BinCodeLog, 'ADJUST', @Diff, GETDATE())
                `);

            // Xác nhận lưu vĩnh viễn nếu không có lỗi
            await transaction.commit();
            return true;

        } catch (error) {
            // Hoàn tác nếu có xung đột dữ liệu
            await transaction.rollback();
            throw new Error('Lỗi giao dịch cân đối kho: ' + error.message);
        }
    }
}

module.exports = AdjustmentDAO;