const InventoryDAO = require('../dao/InventoryDAO');
const InboundRequestDTO = require('../dto/InboundRequestDTO');
const { successResponse } = require('../utils/apiResponse');

class InventoryController {
    // 1. Điều phối nghiệp vụ Nhập kho
    static async handleInboundScan(req, res, next) {
        try {
            const inboundData = new InboundRequestDTO(req.body);

            if (!inboundData.isValid()) {
                return res.status(400).json({ 
                    status: 'error', 
                    message: 'Dữ liệu đầu vào không hợp lệ hoặc số lượng <= 0' 
                });
            }

            const userId = req.user? req.user.id : 1; 
            const invoiceId = await InventoryDAO.processInbound(inboundData, userId);

            // KÍCH HOẠT REAL-TIME: Thông báo cho Dashboard cập nhật biểu đồ
            const io = req.app.get('io'); 
            if (io) {
                io.emit('inventory_updated', {
                    type: 'INBOUND',
                    sku: inboundData.barcode,
                    binCode: inboundData.binCode,
                    message: `Hàng mới vừa nhập vào ô kệ ${inboundData.binCode}`
                });
            }

            return successResponse(res, 200, 'Nhập kho và cập nhật số dư thành công!', { invoiceId });

        } catch (error) {
            next(error); 
        }
    }

    // 2. Điều phối nghiệp vụ Điều chuyển nội bộ
    static async handleTransfer(req, res, next) {
        try {
            const userId = req.user? req.user.id : 1;
            await InventoryDAO.transferStock(req.body, userId);

            // Bắn tín hiệu WebSockets để sơ đồ kho (Virtual Map) đổi màu ô kệ
            const io = req.app.get('io');
            if (io) {
                io.emit('inventory_updated', {
                    type: 'TRANSFER',
                    sku: req.body.sku,
                    from: req.body.sourceBin,
                    to: req.body.destBin
                });
            }

            return successResponse(res, 200, 'Điều chuyển hàng thành công!');
        } catch (error) { 
            next(error); 
        }
    }
}

module.exports = InventoryController;