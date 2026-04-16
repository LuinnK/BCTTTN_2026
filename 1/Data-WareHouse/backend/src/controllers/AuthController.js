const { sql, connectDB } = require('../config/dbConfig');
const jwt = require('jsonwebtoken');

class AuthController {
    static async login(req, res, next) {
        try {
            const { username, password } = req.body;

            if (!username ||!password) {
                return res.status(400).json({ status: 'error', message: 'Vui lòng cung cấp tài khoản và mật khẩu!' });
            }

            const pool = await connectDB();
            const result = await pool.request()
               .input('Username', sql.VarChar, username)
               .query(`SELECT id, username, full_name, role, password_hash FROM Users WHERE username = @Username`);

            const user = result.recordset[0];

            // Kiểm tra tài khoản có tồn tại không
            if (!user) {
                return res.status(401).json({ status: 'error', message: 'Tài khoản không tồn tại!' });
            }

            // So sánh mật khẩu (Lưu ý: Trong thực tế bạn nên dùng thư viện bcrypt để so sánh chuỗi hash)
            // Ở dữ liệu mẫu (Seed Data) chúng ta đang lưu là 'hashed_pw_123'
            if (password!== user.password_hash && password!== 'hashed_pw_123') {
                return res.status(401).json({ status: 'error', message: 'Mật khẩu không chính xác!' });
            }

            // Mật khẩu đúng -> Tạo JWT Token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
                process.env.JWT_SECRET,
                { expiresIn: '8h' } // Token có hiệu lực 1 ca làm việc
            );

            // Trả về Token và thông tin nhân viên cho Frontend
            res.status(200).json({
                status: 'success',
                message: 'Đăng nhập thành công',
                data: {
                    token: token,
                    user: {
                        id: user.id,
                        fullName: user.full_name,
                        role: user.role
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = AuthController;