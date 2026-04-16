class ForecastService {
    /**
     * Tính toán dự báo nhu cầu bằng Exponential Smoothing
     * @param {Array<Number>} historicalData - Mảng dữ liệu thực tế (ví dụ: [120, 130, 110])
     * @param {Number} alpha - Hệ số san bằng (0 < alpha < 1)
     * @returns {Number} - Con số dự báo cho chu kỳ tiếp theo
     */
    static calculateExponentialSmoothing(historicalData, alpha = 0.3) {
        // 1. Trả về 0 nếu mảng rỗng hoặc không hợp lệ
        if (!historicalData || historicalData.length === 0) return 0;
        
        // 2. SỬA LỖI: Trả về phần tử đầu tiên historicalData[0] thay vì cả mảng
        if (historicalData.length === 1) return historicalData[0];

        // 3. SỬA LỖI: Khởi tạo currentForecast bằng GIÁ TRỊ đầu tiên (số), không phải mảng
        let currentForecast = historicalData[0];

        // 4. Vòng lặp tính toán qua các kỳ thực tế
        // Công thức: F_{t+1} = alpha * Actual_t + (1 - alpha) * Forecast_t
        for (let i = 1; i < historicalData.length; i++) {
            const actualDemand = historicalData[i]; 
            currentForecast = (alpha * actualDemand) + ((1 - alpha) * currentForecast);
        }

        // 5. Làm tròn kết quả cuối cùng
        return Math.round(currentForecast); 
    }
}

module.exports = ForecastService;