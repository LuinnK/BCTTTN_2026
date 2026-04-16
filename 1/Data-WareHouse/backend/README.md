Smart Warehouse Management System (WMS) - Backend
Hệ thống Quản trị kho thông minh và Tối ưu hóa chuỗi cung ứng dành cho các doanh nghiệp vừa và nhỏ (SMEs). Backend được xây dựng theo mô hình phân tầng chuyên sâu (MVC + DAO + DTO), đảm bảo tính toàn vẹn dữ liệu giao dịch ACID và hỗ trợ dự báo nhu cầu bằng thuật toán San bằng số mũ.

+ Công nghệ sử dụng
Runtime: Node.js (v22+)

Framework: Express.js 

Database: Microsoft SQL Server (MSSQL) 

Real-time: Socket.io (Cảnh báo tồn kho thời gian thực) 

Security: JSON Web Token (JWT) & Parameterized Queries

Testing: Jest 

+ Cấu trúc thư mục (src/)
config/: Cấu hình kết nối SQL Server (Pool) & Socket.io.

controllers/: Điều phối xử lý API và logic nghiệp vụ.

dao/: Data Access Object - Tầng duy nhất thực thi truy vấn T-SQL & Transaction.

dto/: Data Transfer Object - Chuẩn hóa dữ liệu đầu vào và đầu ra.

middlewares/: Rào chắn xác thực JWT, phân quyền Role-based & bẫy lỗi toàn cục.

routes/: Định tuyến API Endpoints (7 modules: Auth, Product, Supplier, Inventory, Outbound, Audit, Analytics).

services/: Xử lý thuật toán dự báo nhu cầu (Exponential Smoothing).

utils/: Các hàm tiện ích dùng chung (Chuẩn hóa phản hồi API).

+ Cài đặt và Vận hành
1. Cài đặt thư viện
Gõ lệnh sau tại thư mục gốc:
npm install

2. Cấu hình biến môi trường (.env)
Tạo tệp.env và điền các thông số kết nối:
PORT=5000
NODE_ENV=development
DB_USER=sa
DB_PASSWORD=your_password
DB_SERVER=localhost
DB_NAME=SmartWarehouseDB
DB_PORT=1433
JWT_SECRET=super_secret_warehouse_key_2025

3. Cấu hình SQL Server
Bật giao thức TCP/IP trong SQL Server Configuration Manager.

Đảm bảo cổng mặc định là 1433.

Chạy các Script khởi tạo bảng (Schema) và dữ liệu mẫu (Seed Data) kèm theo trong báo cáo.

4. Khởi chạy Server
npm start

+ Danh sách API chính
Header bắt buộc cho các API bảo mật: Authorization: Bearer <your_token>

Đăng nhập: POST /api/v1/auth/login

Sản phẩm: GET /api/v1/products/barcode/:code (Quét mã), POST /api/v1/products (Thêm mới).

Kho vận: POST /api/v1/inventory/inbound (Nhập kho), POST /api/v1/inventory/transfer (Điều chuyển kệ).

Xuất hàng: GET /api/v1/outbound/suggest/:sku (Gợi ý FEFO/FIFO), POST /api/v1/outbound/confirm (Xác nhận xuất).

Phân tích: GET /api/v1/analytics/forecast/:sku (Dự báo nhu cầu), GET /api/v1/analytics/summary (Báo cáo Dashboard).

Kiểm kê: GET /api/v1/audit/bin/:binCode (Kiểm tra số dư), POST /api/v1/audit/adjust (Cân đối chênh lệch).

+ Kiểm thử (Testing)
Chạy Unit Test cho thuật toán dự báo:
npm run test

+ Sự kiện Real-time (Socket.io)
stock_alert: Phát tín hiệu khi hàng chạm ngưỡng an toàn (ROP).

inventory_updated: Cập nhật trạng thái Dashboard tức thì khi có biến động kho.