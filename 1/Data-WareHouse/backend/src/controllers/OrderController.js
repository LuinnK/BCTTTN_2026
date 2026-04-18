const OrderDAO = require('../dao/OrderDAO');
const BatchDAO = require('../dao/BatchDAO');
const OutboundRequestDAO = require('../dao/OutboundRequestDAO');
const { sql, connectDB } = require('../config/dbConfig');

class OrderController {
    static async listOrders(req, res, next) {
        try {
            const orders = await OrderDAO.listAll();
            res.status(200).json({ status: 'success', data: orders });
        } catch (error) {
            next(error);
        }
    }

    static async createOrder(req, res, next) {
        try {
            const { orderCode, type, lines } = req.body;
            if (!orderCode || !lines || lines.length === 0) {
                return res.status(400).json({ status: 'error', message: 'Thiếu thông tin đơn hàng hoặc sản phẩm' });
            }

            const orderId = await OrderDAO.create(orderCode, type || 'SALES', 'PENDING', lines);
            res.status(201).json({ status: 'success', message: 'Đã tạo đơn hàng thành công', data: { orderId } });
        } catch (error) {
            next(error);
        }
    }

    static async getOrderDetails(req, res, next) {
        try {
            const orderId = req.params.id;
            const order = await OrderDAO.findById(orderId);
            if (!order) return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng' });

            const lines = await OrderDAO.getOrderLines(orderId);
            res.status(200).json({ status: 'success', data: { order, lines } });
        } catch (error) {
            next(error);
        }
    }

    // Xử lý đơn hàng: Tạo phiếu xuất kho (OutboundRequest) tự động dựa trên tồn kho FEFO
    static async allocateOrder(req, res, next) {
        try {
            const orderId = req.params.id;
            const userId = req.user?.id || 1; // Mặc định người thực hiện nếu không có
            
            const order = await OrderDAO.findById(orderId);
            if (!order) return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng' });
            
            if (order.status !== 'PENDING') {
                return res.status(400).json({ status: 'error', message: 'Chỉ có thể xử lý đơn hàng đang PENDING' });
            }

            const lines = await OrderDAO.getOrderLines(orderId);
            const createdRequests = [];

            // Mở connection pool một lần ngoài vòng lặp để tối ưu hiệu suất
            const pool = await connectDB();

            // Duyệt từng sản phẩm trong đơn
            for (const line of lines) {
                let remainingQty = line.quantity;
                const sku = line.sku;

                // Lấy các bin có hàng FEFO cho SKU này
                const batches = await BatchDAO.findBatchesByFEFO(sku);
                
                for (const batch of batches) {
                    if (remainingQty <= 0) break;
                    
                    const allocateQty = Math.min(batch.quantity, remainingQty);
                    if (allocateQty > 0) {
                        // Tạo yêu cầu xuất kho cho bin này
                        const row = await OutboundRequestDAO.create({
                            userId,
                            sku: sku,
                            binCode: batch.bin_code,
                            quantity: allocateQty,
                            reason: 'Xuất hàng cho Đơn hàng ' + order.order_code
                        });
                        
                        // Link with order_id if column exists (we added it)
                        await pool.request().input('OrderId', sql.Int, orderId).input('ReqId', sql.Int, row.id).query('UPDATE OutboundRequests SET order_id = @OrderId WHERE id = @ReqId');

                        createdRequests.push(row);
                        remainingQty -= allocateQty;
                    }
                }

                if (remainingQty > 0) {
                    return res.status(400).json({ 
                        status: 'error', 
                    message: `Không đủ tồn kho để đáp ứng sản phẩm ${sku}. Còn thiếu ${remainingQty}`
                    });
                }
            }

            // Nếu thành công tất cả, chuyển trạng thái đơn hàng sang PROCESSING
            await OrderDAO.updateStatus(orderId, 'PROCESSING');
            
            res.status(200).json({ 
                status: 'success', 
                message: 'Đã tạo yêu cầu xuất kho cho đơn hàng', 
                data: createdRequests 
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = OrderController;