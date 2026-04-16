import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/services/api';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const { alerts } = useSocket();
  const { addToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([loadSummary(), loadLowStock()]);
  };

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboardSummary();
      setSummary(res.data);
    } catch (err) {
      if (err.message?.includes('403') || err.message?.includes('quyền')) {
        setError('Bạn không có quyền xem thống kê tổng quan.');
      } else {
        setError(err.message || 'Không thể tải dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLowStock = async () => {
    if (!hasRole('ADMIN', 'MANAGER')) return;
    setLowStockLoading(true);
    try {
      const res = await api.getLowStockList(10);
      setLowStock(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err.message || 'Không thể tải danh sách tồn kho thấp', 'error');
    } finally {
      setLowStockLoading(false);
    }
  };

  const statCards = summary
    ? [
        {
          title: 'Tổng SKU',
          value: summary.totalSKUs ?? 0,
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
          color: 'blue',
        },
        {
          title: 'Tồn kho thấp',
          value: summary.lowStockItems ?? 0,
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'yellow',
        },
        {
          title: 'Tổng tồn kho',
          value: summary.totalUnits ?? 0,
          icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ),
          color: 'green',
        },
      ]
    : [];

  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Xin chào, <span className="font-semibold">{user?.fullName || user?.username}</span>! Chúc bạn làm việc hiệu quả.
          </p>
        </div>
        <button onClick={loadAll} className="btn-primary text-sm" disabled={loading || lowStockLoading}>
          ↻ Làm mới
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
      ) : error ? (
        <div className="card bg-red-50 border-red-200 text-red-600 text-center py-8">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((s) => (
            <div key={s.title} className="card flex items-center gap-4">
              <div className={`p-3 rounded-xl ${colorMap[s.color]}`}>{s.icon}</div>
              <div>
                <p className="text-sm text-gray-500">{s.title}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Realtime Alerts */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          🔔 Cảnh báo thời gian thực
        </h2>
        {alerts.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Chưa có cảnh báo nào.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((a, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
                  a.type === 'stock_alert'
                    ? 'bg-red-50 border border-red-200'
                    : a.type === 'inventory_adjusted'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <span className="text-lg">
                  {a.type === 'stock_alert' ? '⚠️' : a.type === 'inventory_adjusted' ? '🔧' : '📦'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{a.message || JSON.stringify(a.data)}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low stock list */}
      {hasRole('ADMIN', 'MANAGER') && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">⚠️ Danh sách tồn kho thấp (theo ROP)</h2>
            <button onClick={loadLowStock} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition" disabled={lowStockLoading}>
              {lowStockLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          {lowStockLoading ? (
            <div className="text-gray-400 text-center py-6">Đang tải danh sách...</div>
          ) : lowStock.length === 0 ? (
            <div className="text-gray-400 text-center py-6">Không có SKU nào đang dưới/ngang ROP.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">SKU</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-600">Tên</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Tồn</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">ROP</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-600">Thiếu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lowStock.map((i) => {
                    const onHand = Number(i.onHand ?? 0);
                    const rop = Number(i.rop ?? 0);
                    const shortage = Math.max(0, rop - onHand);
                    return (
                      <tr key={i.productId ?? i.sku} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2 font-mono font-medium">{i.sku}</td>
                        <td className="px-4 py-2">{i.name || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">{onHand.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{rop.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-red-600 font-semibold">{shortage.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">📋 Thông tin tài khoản</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Username</td>
                <td className="py-2 font-medium">{user?.username}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Họ tên</td>
                <td className="py-2 font-medium">{user?.fullName}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Vai trò</td>
                <td className="py-2">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                    {user?.role}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">⚡ Chức năng nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/inbound" className="block p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition">
              <span className="text-2xl">📥</span>
              <p className="text-xs mt-1 font-medium text-blue-700">Nhập kho</p>
            </a>
            <a href="/outbound" className="block p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition">
              <span className="text-2xl">📤</span>
              <p className="text-xs mt-1 font-medium text-green-700">Xuất kho</p>
            </a>
            <a href="/products" className="block p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition">
              <span className="text-2xl">📦</span>
              <p className="text-xs mt-1 font-medium text-purple-700">Sản phẩm</p>
            </a>
            <a href="/audit" className="block p-3 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100 transition">
              <span className="text-2xl">🔍</span>
              <p className="text-xs mt-1 font-medium text-yellow-700">Kiểm kho</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
