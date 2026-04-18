const { sql, connectDB } = require('../config/dbConfig');

class OrderDAO {
    static async listAll() {
        const pool = await connectDB();
        const result = await pool.query(`
            SELECT id, order_code, type, status, created_at 
            FROM Orders 
            ORDER BY created_at DESC
        `);
        return result.recordset;
    }

    static async findById(id) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query(`
                SELECT id, order_code, type, status, created_at 
                FROM Orders 
                WHERE id = @Id
            `);
        return result.recordset[0] || null;
    }

    static async getOrderLines(orderId) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('OrderId', sql.Int, orderId)
            .query(`
                SELECT ol.id, ol.order_id, ol.product_id, ol.quantity, p.sku, p.name 
                FROM OrderLines ol
                JOIN Products p ON p.id = ol.product_id
                WHERE ol.order_id = @OrderId
            `);
        return result.recordset;
    }

    static async create(orderCode, type, status, lines) {
        const pool = await connectDB();
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            
            const req = new sql.Request(transaction);
            const orderResult = await req
                .input('Code', sql.VarChar, orderCode)
                .input('Type', sql.VarChar, type)
                .input('Status', sql.VarChar, status)
                .query(`
                    INSERT INTO Orders (order_code, type, status, created_at) 
                    OUTPUT INSERTED.id 
                    VALUES (@Code, @Type, @Status, GETDATE())
                `);
            const orderId = orderResult.recordset[0].id;

            for (const line of lines) {
                const lineReq = new sql.Request(transaction);
                await lineReq
                    .input('OrderId', sql.Int, orderId)
                    .input('ProductId', sql.Int, line.productId)
                    .input('Qty', sql.Int, line.quantity)
                    .query(`
                        INSERT INTO OrderLines (order_id, product_id, quantity) 
                        VALUES (@OrderId, @ProductId, @Qty)
                    `);
            }
            await transaction.commit();
            return orderId;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateStatus(id, status) {
        const pool = await connectDB();
        const result = await pool.request()
            .input('Id', sql.Int, id)
            .input('Status', sql.VarChar, status)
            .query(`
                UPDATE Orders 
                SET status = @Status 
                WHERE id = @Id
            `);
        return result.rowsAffected[0] > 0;
    }
}

module.exports = OrderDAO;