const AdjustmentDAO = require('../dao/AdjustmentDAO');
const { sql, connectDB } = require('../config/dbConfig');

class AuditController {
    // API 1: Lấy danh sách sản phẩm theo sổ sách tại 1 vị trí ô kệ
    static async getBinInventory(req, res, next) {
        try {
            const { binCode } = req.params;
            const pool = await connectDB();
            
            const result = await pool.request()
               .input('BinCode', sql.VarChar, binCode)
               .query(`
                    SELECT
                        p.sku,
                        p.name,
                        i.quantity AS expectedQty,
                        COALESCE(latestInbound.batch_no, b.batch_no) AS batchNo,
                        COALESCE(latestInbound.expiry_date, b.expiry_date) AS expiryDate
                    FROM Inventories i
                    JOIN Products p ON p.id = i.product_id
                    LEFT JOIN Batches b ON b.id = i.batch_id
                    OUTER APPLY (
                        SELECT TOP 1
                            d.batch_no,
                            d.expiry_date
                        FROM InvoiceDetails d
                        WHERE d.product_id = i.product_id
                          AND d.bin_code = i.bin_code
                        ORDER BY d.invoice_id DESC
                    ) latestInbound
                    WHERE i.bin_code = @BinCode
                `);

            if (result.recordset.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Vị trí này đang trống hoặc không tồn tại!' });
            }

            res.status(200).json({ status: 'success', data: result.recordset });
        } catch (error) {
            next(error);
        }
    }

    // API 2: Xử lý cân đối (Phê duyệt điều chỉnh)
    static async processInventoryAdjustment(req, res, next) {
        try {
            const auditData = req.body; 
            // Payload bao gồm: binCode, sku, expectedQty, actualQty, reason
            const userId = req.user? req.user.id : 1;

            // Tính toán mức độ chênh lệch
            const discrepancy = auditData.actualQty - auditData.expectedQty;

            if (discrepancy === 0) {
                return res.status(200).json({ 
                    status: 'success', 
                    message: 'Số lượng thực tế khớp với sổ sách, không cần điều chỉnh.' 
                });
            }

            // Gọi DAO thực thi Transaction cân đối kho
            await AdjustmentDAO.processInventoryAdjustment(auditData, userId);

            // Bắn WebSockets thông báo Dashboard cập nhật lại biểu đồ kho 
            const io = req.app.get('io');
            if (io) {
                io.emit('inventory_adjusted', {
                    binCode: auditData.binCode,
                    sku: auditData.sku,
                    discrepancy: discrepancy
                });
            }

            res.status(200).json({
                status: 'success',
                message: 'Đã cập nhật chênh lệch và cân đối tồn kho thành công!',
                data: { discrepancy: discrepancy }
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuditController;