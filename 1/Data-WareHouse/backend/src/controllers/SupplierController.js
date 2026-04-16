const SupplierDAO = require('../dao/SupplierDAO');

class SupplierController {
    static async list(req, res, next) {
        try {
            const data = await SupplierDAO.getAll();
            res.status(200).json({ status: 'success', data });
        } catch (error) { next(error); }
    }

    static async add(req, res, next) {
        try {
            await SupplierDAO.create(req.body);
            res.status(201).json({ status: 'success', message: 'Thêm NCC thành công!' });
        } catch (error) { next(error); }
    }
}
module.exports = SupplierController;