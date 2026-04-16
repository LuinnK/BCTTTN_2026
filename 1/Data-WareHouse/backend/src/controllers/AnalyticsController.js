const SalesDAO = require('../dao/SalesDAO');
const ProductDAO = require('../dao/ProductDAO'); 
const ForecastService = require('../services/ForecastService');
const { connectDB } = require('../config/dbConfig'); // ĐÃ BỔ SUNG IMPORT
const { successResponse } = require('../utils/apiResponse'); // SỬ DỤNG UTILS

class AnalyticsController {
    // 1. API Chạy thuật toán Dự báo nhu cầu
    static async runDemandForecast(req, res, next) {
        try {
            const { sku } = req.params;
            const lookupCode = String(sku || '').trim();
            const alpha = parseFloat(req.query.alpha) || 0.3; 

            // Lấy dữ liệu sản phẩm: ưu tiên theo SKU, fallback theo Barcode
            let productRes = await ProductDAO.findBySku(lookupCode);
            if (!productRes || productRes.length === 0) {
                productRes = await ProductDAO.findByBarcode(lookupCode);
            }
            if (!productRes || productRes.length === 0) {
                return res.status(404).json({ status: 'error', message: 'Không tìm thấy sản phẩm' });
            }
            const productData = productRes[0]; // Trích xuất bản ghi đầu tiên từ mảng

            // Lấy lịch sử xuất kho trong 6 tháng
            const historicalDemands = await SalesDAO.getHistoricalData(productData.sku);
            
            if (historicalDemands.length === 0) {
                return successResponse(res, 200, 'Chưa có đủ dữ liệu lịch sử để chạy dự báo.', {
                    sku: productData.sku,
                    historical: [],
                    historicalDemands: [],
                    nextForecast: 0,
                    forecastedDemandNextMonth: 0,
                    reorderPoint: Math.round(productData.rop || 0),
                    suggestedROP: Math.round(productData.rop || 0),
                    alphaUsed: alpha
                });
            }

            // Chạy thuật toán San bằng số mũ (Exponential Smoothing) [3, 4]
            const forecastedDemand = ForecastService.calculateExponentialSmoothing(historicalDemands, alpha);

            // Tính toán Điểm đặt hàng lại (ROP) [5]
            const leadTimeDays = 7; 
            const dailyDemand = forecastedDemand / 30; 
            const safetyStock = productData.safety_stock || 10;
            
            const rop = Math.round((dailyDemand * leadTimeDays) + safetyStock);

            return successResponse(res, 200, 'Dự báo hoàn tất', {
                sku: productData.sku,
                historical: historicalDemands.map((value, index) => ({ month: `T${index + 1}`, totalOut: Number(value) || 0 })),
                historicalDemands: historicalDemands,
                nextForecast: forecastedDemand,
                forecastedDemandNextMonth: forecastedDemand,
                reorderPoint: rop,
                suggestedROP: rop,
                alphaUsed: alpha
            });

        } catch (error) {
            next(error);
        }
    }

    // 2. API Lấy thông tin tổng quát Dashboard (MIS Summary) [5]
    static async getDashboardSummary(req, res, next) {
        try {
            const pool = await connectDB();
            const stats = await pool.request().query(`
                SELECT 
                    (SELECT COUNT(*) FROM Products) as totalSKUs,
                    (
                        SELECT COUNT(*)
                        FROM Inventories i
                        JOIN Products p ON p.id = i.product_id
                        WHERE i.quantity <= ISNULL(p.rop, 0)
                    ) as lowStockItems,
                    (SELECT SUM(quantity) FROM Inventories) as totalUnits
            `);
            
            // Trả về bản ghi duy nhất chứa các con số tổng hợp
            return successResponse(res, 200, 'Tải báo cáo thành công', stats.recordset?.[0] || { totalSKUs: 0, lowStockItems: 0, totalUnits: 0 });
        } catch (error) { 
            next(error); 
        }
    }

    // 3. API: Danh sách SKU tồn kho thấp (dựa trên ROP)
    static async getLowStockList(req, res, next) {
        try {
            const limit = Math.min(Number(req.query.limit) || 20, 200);
            const pool = await connectDB();

            const result = await pool.request()
                .input('Limit', limit)
                .query(`
                    SELECT TOP (@Limit)
                        p.id as productId,
                        p.sku,
                        p.name,
                        ISNULL(p.rop, 0) as rop,
                        ISNULL(SUM(i.quantity), 0) as onHand
                    FROM Products p
                    LEFT JOIN Inventories i ON i.product_id = p.id
                    GROUP BY p.id, p.sku, p.name, p.rop
                    HAVING ISNULL(SUM(i.quantity), 0) <= ISNULL(p.rop, 0)
                    ORDER BY (ISNULL(p.rop, 0) - ISNULL(SUM(i.quantity), 0)) DESC, p.sku ASC
                `);

            return successResponse(res, 200, 'Tải danh sách tồn kho thấp thành công', result.recordset || []);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AnalyticsController;