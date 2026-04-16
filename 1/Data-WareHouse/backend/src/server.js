const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); 
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app'); 
const { connectDB } = require('./config/dbConfig'); 

// Khởi tạo HTTP Server bọc lấy Express app
const server = http.createServer(app);

// Khởi tạo Socket.io để xử lý Real-time
const io = new Server(server, {
    cors: {
        origin: "*", // Trong thực tế, bạn nên giới hạn tên miền React Frontend tại đây
        methods: ["GET", "POST"]
    }
});

// Gắn io vào app để mọi Controller đều có thể gọi req.app.get('io')
app.set('io', io);

// Lắng nghe sự kiện kết nối Socket
io.on('connection', (socket) => {
    console.log(`Một thiết bị vừa kết nối (ID: ${socket.id})`);

    socket.on('disconnect', () => {
        console.log(`Thiết bị ngắt kết nối (ID: ${socket.id})`);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
    console.log(`Ứng dụng đang chạy tại cổng ${PORT}`);
    console.log(`Đã sẵn sàng phát sóng thời gian thực`);
    
    // Khởi tạo kết nối SQL Server
    await connectDB();
});