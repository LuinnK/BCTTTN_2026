const ForecastService = require('../src/services/ForecastService');

describe('Kiểm thử Thuật toán Dự báo Nhu cầu - Exponential Smoothing', () => {
    it('Phải trả về 0 nếu dữ liệu lịch sử trống', () => {
        const result = ForecastService.calculateExponentialSmoothing();
        expect(result).toBe(0);
    });

    it('Phải trả về đúng con số ban đầu nếu chỉ có 1 tháng dữ liệu', () => {
        // Truyền mảng [ 150 ] vào trong hàm
        const result = ForecastService.calculateExponentialSmoothing([ 150 ]);
        expect(result).toBe(150);
    });

    it('Phải dự báo chính xác số lượng nhập hàng với hệ số alpha = 0.3', () => {
        // Điền mảng dữ liệu vào đây
        const historicalData = [ 100, 120, 130 ];
        const alpha = 0.3;
        
        const result = ForecastService.calculateExponentialSmoothing(historicalData, alpha);
        expect(result).toBe(113);
    });
});