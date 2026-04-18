const BatchDAO = require('../dao/BatchDAO');
const OutboundRequestDAO = require('../dao/OutboundRequestDAO');
const { sql, connectDB } = require('../config/dbConfig');
const { isPrivilegedRole } = require('../middlewares/roleMiddleware');

class OutboundController {
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

    /** Nhân viên gửi yêu cầu xuất kho (chưa trừ tồn) */
    static async createOutboundRequest(req, res, next) {
        try {
            const userId = req.user?.id;
            const { sku, binCode, quantity, reason } = req.body;
            if (!sku || !binCode || quantity == null) {
                return res.status(400).json({ status: 'error', message: 'Thiếu SKU, bin hoặc số lượng.' });
            }
            const qty = parseInt(quantity, 10);
            if (Number.isNaN(qty) || qty < 1) {
                return res.status(400).json({ status: 'error', message: 'Số lượng không hợp lệ.' });
            }

            const row = await OutboundRequestDAO.create({
                userId,
                sku: String(sku).trim(),
                binCode: String(binCode).trim(),
                quantity: qty,
                reason: reason ? String(reason).trim() : null,
            });

            const io = req.app.get('io');
            if (io) {
                io.emit('outbound_request_pending', {
                    id: row.id,
                    sku: row.sku,
                    bin_code: row.bin_code,
                    quantity: row.quantity,
                    requester_id: userId,
                });
            }

            res.status(201).json({
                status: 'success',
                message: 'Đã gửi yêu cầu xuất kho, chờ quản lý duyệt.',
                data: row,
            });
        } catch (error) {
            next(error);
        }
    }

    /** Admin / Quản lý: danh sách theo trạng thái (mặc định PENDING) */
    static async listOutboundRequests(req, res, next) {
        try {
            const status = (req.query.status || 'PENDING').toUpperCase();
            const rows = await OutboundRequestDAO.listByStatus(status);
            res.status(200).json({ status: 'success', data: rows });
        } catch (error) {
            next(error);
        }
    }

    /** Nhân viên: yêu cầu do mình tạo */
    static async listMyOutboundRequests(req, res, next) {
        try {
            const userId = req.user?.id;
            const rows = await OutboundRequestDAO.listByRequester(userId);
            res.status(200).json({ status: 'success', data: rows });
        } catch (error) {
            next(error);
        }
    }

    static async approveOutboundRequest(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ status: 'error', message: 'Mã yêu cầu không hợp lệ.' });
            }
            const reviewerId = req.user?.id;
            const ok = await OutboundRequestDAO.approve(id, reviewerId, null);
            if (!ok) {
                return res.status(404).json({ status: 'error', message: 'Không tìm thấy yêu cầu hoặc đã xử lý.' });
            }
            res.status(200).json({ status: 'success', message: 'Đã duyệt yêu cầu xuất kho.' });
        } catch (error) {
            next(error);
        }
    }

    static async rejectOutboundRequest(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return res.status(400).json({ status: 'error', message: 'Mã yêu cầu không hợp lệ.' });
            }
            const reviewerId = req.user?.id;
            const { note } = req.body;
            const ok = await OutboundRequestDAO.reject(id, reviewerId, note || null, null);
            if (!ok) {
                return res.status(404).json({ status: 'error', message: 'Không tìm thấy yêu cầu hoặc đã xử lý.' });
            }
            res.status(200).json({ status: 'success', message: 'Đã từ chối yêu cầu xuất kho.' });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Trừ tồn + log.
     * - ADMIN/MANAGER: có thể xuất trực tiếp (không cần requestId).
     * - Nhân viên khác: bắt buộc requestId trỏ tới yêu cầu APPROVED của chính mình, khớp SKU/bin/SL.
     */
    static async processOutbound(req, res, next) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);

        try {
            const { sku, binCode, quantity, requestId } = req.body;
            const userId = req.user?.id;
            const role = req.user?.role;

            if (!sku || !binCode || quantity == null) {
                return res.status(400).json({ status: 'error', message: 'Thiếu SKU, bin hoặc số lượng.' });
            }
            const qty = parseInt(quantity, 10);
            if (Number.isNaN(qty) || qty < 1) {
                return res.status(400).json({ status: 'error', message: 'Số lượng không hợp lệ.' });
            }

            const skuTrim = String(sku).trim();
            const binTrim = String(binCode).trim();

            let completedRequestId = null;
            const ridRaw = requestId != null && requestId !== '' ? parseInt(requestId, 10) : NaN;

            if (!isPrivilegedRole(role)) {
                if (Number.isNaN(ridRaw)) {
                    return res.status(400).json({
                        status: 'error',
                        message:
                            'Nhân viên cần gửi yêu cầu xuất kho và được duyệt trước. Nhập mã yêu cầu (requestId) khi xác nhận xuất.',
                    });
                }
                const obr = await OutboundRequestDAO.findById(ridRaw);
                if (!obr) {
                    return res.status(404).json({ status: 'error', message: 'Không tìm thấy yêu cầu xuất kho.' });
                }
                if (obr.requested_by !== userId) {
                    return res.status(403).json({ status: 'error', message: 'Bạn chỉ được xác nhận yêu cầu do chính mình tạo.' });
                }
                if (obr.status !== 'APPROVED') {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Yêu cầu chưa được duyệt hoặc đã hoàn tất.',
                    });
                }
                if (obr.sku !== skuTrim || obr.bin_code !== binTrim || obr.quantity !== qty) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Dữ liệu xuất kho không khớp với yêu cầu đã duyệt (SKU, bin, số lượng).',
                    });
                }
                completedRequestId = ridRaw;
            } else if (!Number.isNaN(ridRaw)) {
                const obr = await OutboundRequestDAO.findById(ridRaw);
                if (!obr) {
                    return res.status(404).json({ status: 'error', message: 'Không tìm thấy yêu cầu xuất kho.' });
                }
                if (obr.status !== 'APPROVED') {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Yêu cầu chưa được duyệt hoặc đã hoàn tất.',
                    });
                }
                if (obr.sku !== skuTrim || obr.bin_code !== binTrim || obr.quantity !== qty) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Dữ liệu xuất kho không khớp với yêu cầu (SKU, bin, số lượng).',
                    });
                }
                completedRequestId = ridRaw;
            }

            await transaction.begin();

            const updateInv = await new sql.Request(transaction)
                .input('BinCode', sql.VarChar, binTrim)
                .input('Quantity', sql.Int, qty)
                .input('SKU', sql.VarChar, skuTrim)
                .query(`
                    UPDATE i SET i.quantity = i.quantity - @Quantity
                    FROM Inventories i
                    JOIN Products p ON p.id = i.product_id
                    WHERE i.bin_code = @BinCode AND p.sku = @SKU AND i.quantity >= @Quantity
                `);

            const affected = updateInv.rowsAffected && updateInv.rowsAffected[0] !== undefined ? updateInv.rowsAffected[0] : 0;
            if (affected === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    status: 'error',
                    message: 'Không đủ tồn kho hoặc sai SKU/vị trí.',
                });
            }

            await new sql.Request(transaction)
                .input('BinCodeLog', sql.VarChar, binTrim)
                .input('QtyLog', sql.Int, qty)
                .query(`
                    INSERT INTO StockLogs (bin_code, action_type, quantity_changed)
                    VALUES (@BinCodeLog, 'OUT', @QtyLog)
                `);

            if (completedRequestId != null) {
                const ok = await OutboundRequestDAO.markCompleted(completedRequestId, transaction);
                if (!ok) {
                    await transaction.rollback();
                    return res.status(400).json({ status: 'error', message: 'Không thể hoàn tất yêu cầu (trạng thái không hợp lệ).' });
                }
            }

            await transaction.commit();

            const currentStock = 10;
            const ROP = 15;
            if (currentStock <= ROP) {
                const io = req.app.get('io');
                if (io) {
                    io.emit('stock_alert', {
                        type: 'WARNING',
                        sku: skuTrim,
                        message: `Mã hàng ${skuTrim} sắp hết! Tồn kho hiện tại: ${currentStock} (Ngưỡng an toàn: ${ROP})`,
                    });
                }
            }

            res.status(200).json({ status: 'success', message: 'Xuất kho và cập nhật sổ sách thành công!' });
        } catch (error) {
            try {
                await transaction.rollback();
            } catch (_) {
                /* ignore */
            }
            next(new Error('Lỗi giao dịch xuất kho: ' + error.message));
        }
    }
}

module.exports = OutboundController;
