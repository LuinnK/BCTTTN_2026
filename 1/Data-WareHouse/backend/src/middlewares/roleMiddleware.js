/** Phân quyền theo role (JWT: role) — so khớp không phân biệt hoa thường */
function requireRoles(...allowed) {
    const upper = allowed.map((r) => String(r).toUpperCase());
    return (req, res, next) => {
        const role = (req.user?.role || '').toUpperCase();
        if (!req.user || !upper.includes(role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Không có quyền thực hiện thao tác này.',
            });
        }
        next();
    };
}

function isPrivilegedRole(role) {
    const r = (role || '').toUpperCase();
    return r === 'ADMIN' || r === 'MANAGER';
}

/** Alias tên cũ — một số route dùng `const authorizeRoles = require(...)` */
const authorizeRoles = requireRoles;

module.exports = requireRoles;
module.exports.requireRoles = requireRoles;
module.exports.authorizeRoles = authorizeRoles;
module.exports.isPrivilegedRole = isPrivilegedRole;
