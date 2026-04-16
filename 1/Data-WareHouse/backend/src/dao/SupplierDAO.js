const { sql, connectDB } = require('../config/dbConfig');

class SupplierDAO {
    static async getAll() {
        const pool = await connectDB();
        const columns = await this.getSupplierColumns(pool);
        const idCol = this.findColumn(columns, ['SupplierID', 'Id', 'ID', 'supplier_id']);
        const nameCol = this.findColumn(columns, ['SupplierName', 'Name', 'Supplier', 'supplier_name']);
        const contactCol = this.findColumn(columns, [
            'ContactPerson',
            'ContactName',
            'Contact',
            'contact_person',
            'contact_name',
            'contactperson',
            'Representative',
            'PersonInCharge',
            'PIC',
            'NguoiLienHe'
        ]);
        const phoneCol = this.findColumn(columns, ['Phone', 'PhoneNumber', 'Tel', 'phone']);
        const emailCol = this.findColumn(columns, ['Email', 'Mail', 'email']);
        const addressCol = this.findColumn(columns, ['Address', 'Addr', 'address']);

        const result = await pool.request().query(`
            SELECT
                ${idCol ? `${this.quoteIdent(idCol)} AS SupplierID` : 'CAST(NULL AS INT) AS SupplierID'},
                ${nameCol ? `${this.quoteIdent(nameCol)} AS SupplierName` : 'CAST(NULL AS NVARCHAR(255)) AS SupplierName'},
                ${contactCol ? `${this.quoteIdent(contactCol)} AS ContactPerson` : 'CAST(NULL AS NVARCHAR(255)) AS ContactPerson'},
                ${phoneCol ? `${this.quoteIdent(phoneCol)} AS Phone` : 'CAST(NULL AS NVARCHAR(50)) AS Phone'},
                ${emailCol ? `${this.quoteIdent(emailCol)} AS Email` : 'CAST(NULL AS NVARCHAR(255)) AS Email'},
                ${addressCol ? `${this.quoteIdent(addressCol)} AS Address` : 'CAST(NULL AS NVARCHAR(255)) AS Address'}
            FROM Suppliers
            ORDER BY ${nameCol ? this.quoteIdent(nameCol) : (idCol ? this.quoteIdent(idCol) : '(SELECT NULL)')}
        `);
        return result.recordset;
    }

    static async create(data) {
        const pool = await connectDB();
        const columns = await this.getSupplierColumns(pool);
        const nameCol = this.findColumn(columns, ['SupplierName', 'Name', 'Supplier', 'supplier_name']);
        const contactCol = this.findColumn(columns, [
            'ContactPerson',
            'ContactName',
            'Contact',
            'contact_person',
            'contact_name',
            'contactperson',
            'Representative',
            'PersonInCharge',
            'PIC',
            'NguoiLienHe'
        ]);
        const phoneCol = this.findColumn(columns, ['Phone', 'PhoneNumber', 'Tel', 'phone']);
        const emailCol = this.findColumn(columns, ['Email', 'Mail', 'email']);
        const addressCol = this.findColumn(columns, ['Address', 'Addr', 'address']);
        const insertColumns = [];
        const insertValues = [];
        const request = pool.request();

        if (!nameCol) {
            throw new Error("Bảng Suppliers chưa có cột tên NCC (ví dụ: SupplierName hoặc Name).");
        }

        request.input('SupplierName', sql.NVarChar, data.SupplierName);
        insertColumns.push(this.quoteIdent(nameCol));
        insertValues.push('@SupplierName');

        if (contactCol) {
            request.input('ContactPerson', sql.NVarChar, data.ContactPerson || null);
            insertColumns.push(this.quoteIdent(contactCol));
            insertValues.push('@ContactPerson');
        }

        if (phoneCol) {
            request.input('Phone', sql.VarChar, data.Phone || null);
            insertColumns.push(this.quoteIdent(phoneCol));
            insertValues.push('@Phone');
        }

        if (emailCol) {
            request.input('Email', sql.VarChar, data.Email || null);
            insertColumns.push(this.quoteIdent(emailCol));
            insertValues.push('@Email');
        }

        if (addressCol) {
            request.input('Address', sql.NVarChar, data.Address || null);
            insertColumns.push(this.quoteIdent(addressCol));
            insertValues.push('@Address');
        }

        await request.query(`
            INSERT INTO Suppliers (${insertColumns.join(', ')})
            VALUES (${insertValues.join(', ')})
        `);
    }

    static async getSupplierColumns(pool) {
        const result = await pool.request().query(`
            SELECT c.name AS ColumnName
            FROM sys.columns c
            INNER JOIN sys.objects o ON c.object_id = o.object_id
            WHERE o.type = 'U' AND o.name = 'Suppliers'
        `);

        return result.recordset.map((row) => row.ColumnName);
    }

    static findColumn(columns, aliases) {
        const lowerMap = new Map(columns.map((col) => [String(col).toLowerCase(), col]));
        for (const alias of aliases) {
            const hit = lowerMap.get(String(alias).toLowerCase());
            if (hit) return hit;
        }
        return null;
    }

    static quoteIdent(name) {
        return `[${String(name).replace(/]/g, ']]')}]`;
    }
}
module.exports = SupplierDAO;