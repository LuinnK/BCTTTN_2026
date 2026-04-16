const { sql, connectDB } = require('../config/dbConfig');

class InventoryDAO {
    // 1. Xử lý Nhập kho (Inbound) với Giao dịch ACID
    static async processInbound(inboundData, userId) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            // Bước 1: Lấy ID Sản phẩm từ Barcode (Sửa lỗi truy cập mảng)
            const productRes = await request
              .input('Barcode', sql.VarChar, inboundData.barcode)
              .query(`SELECT id FROM Products WHERE barcode = @Barcode`);
            
            if (productRes.recordset.length === 0) throw new Error('Sản phẩm không tồn tại!');
            const productId = productRes.recordset.id; // <--- ĐÃ SỬA: Thêm 

            // Bước 2: Tạo phiếu nhập (Invoices)
            const invoiceRes = await request
              .input('UserId', sql.Int, userId)
              .query(`
                    INSERT INTO Invoices (invoice_code, type, user_id, created_at) 
                    OUTPUT INSERTED.id 
                    VALUES (REPLACE(STR(CAST(RAND()*1000000 AS INT), 6), ' ', '0'), 'IN', @UserId, GETDATE())
                `);
            const invoiceId = invoiceRes.recordset.id; // <--- ĐÃ SỬA: Thêm 

            // Bước 3: Ghi chi tiết phiếu nhập (Bổ sung ExpiryDate)
            await request
              .input('InvoiceId', sql.Int, invoiceId)
              .input('ProductId', sql.Int, productId)
              .input('BinCode', sql.VarChar, inboundData.binCode)
              .input('Quantity', sql.Int, inboundData.quantity)
              .input('BatchNo', sql.VarChar, inboundData.batchNo)
              .input('ExpiryDate', sql.DateTime, inboundData.expiryDate)
              .query(`
                    INSERT INTO InvoiceDetails (invoice_id, product_id, bin_code, quantity, batch_no, expiry_date) 
                    VALUES (@InvoiceId, @ProductId, @BinCode, @Quantity, @BatchNo, @ExpiryDate)
                `);

            // Bước 4: Logic cộng dồn tồn kho (Xử lý trường hợp ô kệ mới chưa có hàng)
            await request.query(`
                IF EXISTS (SELECT 1 FROM Inventories WHERE product_id = @ProductId AND bin_code = @BinCode)
                    UPDATE Inventories SET quantity = quantity + @Quantity, last_updated = GETDATE()
                    WHERE product_id = @ProductId AND bin_code = @BinCode
                ELSE
                    INSERT INTO Inventories (product_id, bin_code, quantity, last_updated)
                    VALUES (@ProductId, @BinCode, @Quantity, GETDATE())
            `);

            // Bước 5: Ghi nhật ký biến động tài sản (StockLogs)
            await request.query(`
                INSERT INTO StockLogs (product_id, bin_code, action_type, quantity_changed, created_at)
                VALUES (@ProductId, @BinCode, 'IN', @Quantity, GETDATE())
            `);

            await transaction.commit();
            return invoiceId;

        } catch (error) {
            await transaction.rollback();
            throw new Error('Lỗi giao dịch nhập kho: ' + error.message);
        }
    }

    // 2. Xử lý Điều chuyển nội bộ (Internal Transfer)
    static async transferStock(data, userId) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);

            // Gán tham số cho toàn bộ giao dịch
            request.input('SrcBin', sql.VarChar, data.sourceBin);
            request.input('DestBin', sql.VarChar, data.destBin);
            request.input('SKU', sql.VarChar, data.sku);
            request.input('Qty', sql.Int, data.quantity);

            // 1. Trừ tồn kho ở vị trí Nguồn
            const updateSrc = await request.query(`
                UPDATE i SET i.quantity = i.quantity - @Qty 
                FROM Inventories i JOIN Products p ON p.id = i.product_id 
                WHERE i.bin_code = @SrcBin AND p.sku = @SKU
            `);
            if (updateSrc.rowsAffected === 0) throw new Error('Không tìm thấy sản phẩm tại vị trí nguồn!');

            // 2. Cộng tồn kho ở vị trí Đích (Sử dụng logic Upsert)
            await request.query(`
                DECLARE @PID INT = (SELECT id FROM Products WHERE sku = @SKU);
                IF EXISTS (SELECT 1 FROM Inventories WHERE product_id = @PID AND bin_code = @DestBin)
                    UPDATE Inventories SET quantity = quantity + @Quantity WHERE product_id = @PID AND bin_code = @DestBin
                ELSE
                    INSERT INTO Inventories (product_id, bin_code, quantity) VALUES (@PID, @DestBin, @Qty)
            `);

            // 3. Ghi log song song cho cả vị trí nguồn và đích
            await request.query(`
                DECLARE @PID2 INT = (SELECT id FROM Products WHERE sku = @SKU);
                INSERT INTO StockLogs (product_id, bin_code, action_type, quantity_changed) 
                VALUES (@PID2, @SrcBin, 'TRANSFER', -@Qty), (@PID2, @DestBin, 'TRANSFER', @Qty)
            `);

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw new Error('Lỗi điều chuyển: ' + error.message);
        }
    }
}

module.exports = InventoryDAO;