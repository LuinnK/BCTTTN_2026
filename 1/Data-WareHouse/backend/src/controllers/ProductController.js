const ProductDAO = require('../dao/ProductDAO');

class ProductController {
    static async getProductByBarcode(req, res, next) {
        try {
            const { barcode } = req.params;
            
            // Gọi DAO để tìm sản phẩm
            const product = await ProductDAO.findByBarcode(barcode);

            // Kiểm tra nếu mã vạch không tồn tại trong hệ thống
            if (!product) {
                return res.status(404).json({ 
                    status: 'error', 
                    message: 'Mã vạch không hợp lệ hoặc sản phẩm không tồn tại!' 
                });
            }

            // Trả dữ liệu thành công
            res.status(200).json({ 
                status: 'success', 
                data: product 
            });
        } catch (error) {
            // Đẩy lỗi về cho middleware bẫy lỗi tập trung xử lý
            next(error); 
        }
    }
    // 2. API Tạo mới
    static async create(req, res, next) {
        try {
            await ProductDAO.createProduct(req.body);
            res.status(201).json({ status: 'success', message: 'Thêm sản phẩm thành công!' });
        } catch (error) { next(error); }
    }

    // 3. API Cập nhật
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            await ProductDAO.updateProduct(id, req.body);
            res.status(200).json({ status: 'success', message: 'Cập nhật thành công!' });
        } catch (error) { next(error); }
    }

    // 4. API Xóa
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            await ProductDAO.deleteProduct(id);
            res.status(200).json({ status: 'success', message: 'Đã xóa sản phẩm!' });
        } catch (error) { next(error); }
    }
}

module.exports = ProductController;