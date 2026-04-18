const { sql, connectDB } = require('../config/dbConfig');

class OutboundRequestDAO {
    static async create({ userId, sku, binCode, quantity, reason }) {
        const pool = await connectDB();
        const result = await pool
            .request()
            .input('RequestedBy', sql.Int, userId)
            .input('SKU', sql.VarChar, sku)
            .input('BinCode', sql.VarChar, binCode)
            .input('Qty', sql.Int, quantity)
            .input('Reason', sql.NVarChar, reason || null)
            .query(`
                INSERT INTO OutboundRequests (requested_by, sku, bin_code, quantity, reason, status)
                OUTPUT INSERTED.*
                VALUES (@RequestedBy, @SKU, @BinCode, @Qty, @Reason, 'PENDING')
            `);
        return result.recordset[0];
    }

    static async findById(id) {
        const pool = await connectDB();
        const result = await pool
            .request()
            .input('Id', sql.Int, id)
            .query(`SELECT * FROM OutboundRequests WHERE id = @Id`);
        return result.recordset[0] || null;
    }

    static async listByStatus(status) {
        const pool = await connectDB();
        const result = await pool
            .request()
            .input('Status', sql.VarChar, status)
            .query(`
                SELECT r.*, u.full_name AS requester_name
                FROM OutboundRequests r
                JOIN Users u ON u.id = r.requested_by
                WHERE r.status = @Status
                ORDER BY r.created_at DESC
            `);
        return result.recordset;
    }

    static async listByRequester(userId) {
        const pool = await connectDB();
        const result = await pool
            .request()
            .input('Uid', sql.Int, userId)
            .query(`
                SELECT * FROM OutboundRequests
                WHERE requested_by = @Uid
                ORDER BY created_at DESC
            `);
        return result.recordset;
    }

    static async approve(id, reviewerId, transaction) {
        let result;
        if (transaction) {
            result = await new sql.Request(transaction)
            .input('Id', sql.Int, id)
            .input('Reviewer', sql.Int, reviewerId)
            .query(`
                UPDATE OutboundRequests
                SET status = 'APPROVED', reviewed_by = @Reviewer, reviewed_at = SYSUTCDATETIME(), review_note = NULL
                WHERE id = @Id AND status = 'PENDING'
            `);
        } else {
            const pool = await connectDB();
            result = await pool
                .request()
                .input('Id', sql.Int, id)
                .input('Reviewer', sql.Int, reviewerId)
                .query(`
                UPDATE OutboundRequests
                SET status = 'APPROVED', reviewed_by = @Reviewer, reviewed_at = SYSUTCDATETIME(), review_note = NULL
                WHERE id = @Id AND status = 'PENDING'
            `);
        }
        const n = result.rowsAffected && result.rowsAffected[0] !== undefined ? result.rowsAffected[0] : 0;
        return n > 0;
    }

    static async reject(id, reviewerId, note, transaction) {
        let result;
        if (transaction) {
            result = await new sql.Request(transaction)
            .input('Id', sql.Int, id)
            .input('Reviewer', sql.Int, reviewerId)
            .input('Note', sql.NVarChar, note || null)
            .query(`
                UPDATE OutboundRequests
                SET status = 'REJECTED', reviewed_by = @Reviewer, reviewed_at = SYSUTCDATETIME(), review_note = @Note
                WHERE id = @Id AND status = 'PENDING'
            `);
        } else {
            const pool = await connectDB();
            result = await pool
                .request()
                .input('Id', sql.Int, id)
                .input('Reviewer', sql.Int, reviewerId)
                .input('Note', sql.NVarChar, note || null)
                .query(`
                UPDATE OutboundRequests
                SET status = 'REJECTED', reviewed_by = @Reviewer, reviewed_at = SYSUTCDATETIME(), review_note = @Note
                WHERE id = @Id AND status = 'PENDING'
            `);
        }
        const n = result.rowsAffected && result.rowsAffected[0] !== undefined ? result.rowsAffected[0] : 0;
        return n > 0;
    }

    static async markCompleted(id, transaction) {
        const req = new sql.Request(transaction);
        const result = await req
            .input('Id', sql.Int, id)
            .query(`
                UPDATE OutboundRequests
                SET status = 'COMPLETED'
                WHERE id = @Id AND status = 'APPROVED'
            `);
        const n = result.rowsAffected && result.rowsAffected[0] !== undefined ? result.rowsAffected[0] : 0;
        return n > 0;
    }
}

module.exports = OutboundRequestDAO;
