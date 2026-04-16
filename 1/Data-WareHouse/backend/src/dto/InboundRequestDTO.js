class InboundRequestDTO {
    constructor(data) {
        this.barcode = data.barcode;
        this.binCode = data.binCode; // Mã vị trí ô kệ
        this.quantity = parseInt(data.quantity, 10);
        this.batchNo = data.batchNo || 'N/A';
        this.expiryDate = data.expiryDate || null;
    }

    // Hàm kiểm tra tính hợp lệ cơ bản
    isValid() {
        if (!this.barcode ||!this.binCode || isNaN(this.quantity) || this.quantity <= 0) {
            return false;
        }
        return true;
    }
}

module.exports = InboundRequestDTO;