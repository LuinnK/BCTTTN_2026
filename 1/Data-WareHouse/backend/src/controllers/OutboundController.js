const BatchDAO = require('../dao/BatchDAO');
const { sql, connectDB } = require('../config/dbConfig');

class OutboundController {
    // API 1: Gợi ý vị trí nhặt hàng (Picking List)
    static async getPickingSuggestion(req, res, next) {
        try {
            const { sku } = req.params;
            const batches = await BatchDAO.findBatchesByFEFO(sku);
            
            if (batches.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Hết hàng hoặc SKU không hợp lệ!' });
            }
            
            res.status(200).json({ status: 'success', data: batches });
        } catch (error) {
            next(error);
        }
    }

    // API 2: Xác nhận trừ tồn kho và Bắn cảnh báo Socket.io
    static async processOutbound(req, res, next) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            const { sku, binCode, quantity } = req.body;
            
            // 1. Bắt đầu Giao dịch ACID để trừ kho an toàn [2]
            await transaction.begin();
            const request = new sql.Request(transaction);

            // Logic giả định: Trừ tồn kho tại vị trí cụ thể
            await request
               .input('BinCode', sql.VarChar, binCode)
               .input('Quantity', sql.Int, quantity)
               .query(`
                    UPDATE Inventories 
                    SET quantity = quantity - @Quantity 
                    WHERE bin_code = @BinCode
                `);

            // Ghi nhận nhật ký xuất kho
            await request
               .input('BinCodeLog', sql.VarChar, binCode)
               .input('QtyLog', sql.Int, quantity)
               .query(`
                    INSERT INTO StockLogs (bin_code, action_type, quantity_changed) 
                    VALUES (@BinCodeLog, 'OUT', @QtyLog)
                `);

            await transaction.commit(); // Ghi nhận thành công [2]

            // 2. KÍCH HOẠT SOCKET.IO THỜI GIAN THỰC [3]
            // Giả định: Sau khi truy vấn, hệ thống phát hiện tồn kho hiện tại (vd: 10) đã <= ROP (vd: 15) 
            const currentStock = 10; 
            const ROP = 15;

            if (currentStock <= ROP) {
                // Thủ thuật lấy đối tượng io đã gắn vào biến app từ file server.js [3]
                const io = req.app.get('io'); 
                
                // Phát sóng sự kiện 'stock_alert' tới tất cả thiết bị đang kết nối
                io.emit('stock_alert', {
                    type: 'WARNING',
                    sku: sku,
                    message: `Mã hàng ${sku} sắp hết! Tồn kho hiện tại: ${currentStock} (Ngưỡng an toàn: ${ROP})`
                });
                console.log(` Đã phát tín hiệu ROP cho mã: ${sku}`);
            }

            res.status(200).json({ status: 'success', message: 'Xuất kho và cập nhật sổ sách thành công!' });

        } catch (error) {
            await transaction.rollback(); // Hoàn tác nếu có lỗi [2]
            next(new Error('Lỗi giao dịch xuất kho: ' + error.message));
        }
    }
}

module.exports = OutboundController;