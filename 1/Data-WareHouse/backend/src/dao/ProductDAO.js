const { sql, connectDB } = require('../config/dbConfig');

class ProductDAO {
    // Hàm truy xuất thông tin sản phẩm dựa trên Barcode
    static async findByBarcode(barcode) {
        try {
            // Lấy một kết nối từ pool
            const pool = await sql.connect();
            const result = await pool.request()
               .input('Barcode', sql.VarChar, barcode) // Bảo mật Parameterized Query
               .query(`SELECT id, sku, barcode, name, rop, safety_stock, unit 
                        FROM Products 
                        WHERE barcode = @Barcode`);
            
            // Trả về bản ghi đầu tiên nếu tìm thấy
            return result.recordset;
        } catch (error) {
            throw new Error('Lỗi DAO khi truy vấn sản phẩm: ' + error.message);
        }
    }

    // Hàm truy xuất thông tin sản phẩm theo SKU
    static async findBySku(sku) {
        try {
            const pool = await connectDB();
            const result = await pool.request()
               .input('SKU', sql.VarChar, sku)
               .query(`SELECT id, sku, barcode, name, rop, safety_stock, unit
                        FROM Products
                        WHERE sku = @SKU`);

            return result.recordset;
        } catch (error) {
            throw new Error('Lỗi DAO khi truy vấn sản phẩm theo SKU: ' + error.message);
        }
    }
    // 2. THÊM MỚI: Thêm sản phẩm
    static async createProduct(data) {
        try {
            const pool = await connectDB();
            await pool.request()
              .input('SKU', sql.VarChar, data.sku)
              .input('Barcode', sql.VarChar, data.barcode)
              .input('Name', sql.NVarChar, data.name)
              .input('CategoryID', sql.Int, data.categoryId)
              .input('SupplierID', sql.Int, data.supplierId)
              .input('ROP', sql.Decimal(18,2), data.rop)
              .input('SafetyStock', sql.Decimal(18,2), data.safetyStock)
              .input('Unit', sql.NVarChar, data.unit)
              .query(`INSERT INTO Products (sku, barcode, name, category_id, supplier_id, rop, safety_stock, unit)
                       VALUES (@SKU, @Barcode, @Name, @CategoryID, @SupplierID, @ROP, @SafetyStock, @Unit)`);
            return true;
        } catch (error) {
            throw new Error('Lỗi DAO khi tạo sản phẩm: ' + error.message);
        }
    }

    // 3. THÊM MỚI: Cập nhật thông tin
    static async updateProduct(id, data) {
        try {
            const pool = await connectDB();
            await pool.request()
              .input('ID', sql.Int, id)
              .input('Name', sql.NVarChar, data.name)
              .input('ROP', sql.Decimal(18,2), data.rop)
              .input('SafetyStock', sql.Decimal(18,2), data.safetyStock)
              .query(`UPDATE Products 
                       SET name = @Name, rop = @ROP, safety_stock = @SafetyStock 
                       WHERE id = @ID`);
            return true;
        } catch (error) {
            throw new Error('Lỗi DAO khi cập nhật: ' + error.message);
        }
    }

    // 4. THÊM MỚI: Xóa (Kiểm tra ràng buộc) 
    static async deleteProduct(id) {
        try {
            const pool = await connectDB();
            // Kiểm tra xem sản phẩm đã phát sinh giao dịch chưa
            const check = await pool.request()
              .input('ID', sql.Int, id)
              .query(`SELECT TOP 1 id FROM StockLogs WHERE product_id = @ID`);

            if (check.recordset.length > 0) {
                // Nếu đã có giao dịch, báo lỗi theo quy tắc báo cáo
                throw new Error('Sản phẩm đã có lịch sử kho, không thể xóa. Hãy chuyển sang trạng thái ẩn!');
            }

            await pool.request().input('ID', sql.Int, id).query(`DELETE FROM Products WHERE id = @ID`);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProductDAO;