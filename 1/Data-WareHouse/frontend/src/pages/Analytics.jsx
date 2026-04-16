import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/services/api';

export default function Analytics() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();

  const [sku, setSku] = useState('');
  const [alpha, setAlpha] = useState('0.3');
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);

  const handleForecast = async (e) => {
    e.preventDefault();
    if (!sku.trim()) return;
    setLoading(true);
    setForecast(null);
    try {
      const res = await api.getForecast(sku.trim(), parseFloat(alpha));
      setForecast(res.data);
    } catch (err) {
      addToast(err.message || 'Lỗi dự báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const maxDemand = forecast?.historical
    ? Math.max(...forecast.historical.map((h) => h.totalOut || h.TotalOut || 0), 1)
    : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Phân tích & Dự báo</h1>

      {!hasRole('ADMIN', 'MANAGER') ? (
        <div className="card bg-yellow-50 border-yellow-200 text-yellow-700 text-center py-8">
          Chỉ MANAGER / ADMIN mới có quyền truy cập trang này.
        </div>
      ) : (
        <>
          {/* Forecast Form */}
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">📊 Dự báo nhu cầu (Exponential Smoothing)</h2>
            <form onSubmit={handleForecast} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="VD: SKU001"
                  className="input-field"
                  required
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alpha (α)</label>
                <input
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={alpha}
                  onChange={(e) => setAlpha(e.target.value)}
                  className="input-field"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Đang phân tích...' : '📈 Dự báo'}
              </button>
            </form>
          </div>

          {/* Forecast Results */}
          {forecast && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Dự báo kỳ tiếp theo</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {forecast.nextForecast != null ? Math.round(forecast.nextForecast) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">đơn vị</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Điểm đặt hàng lại (ROP)</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">
                    {forecast.reorderPoint != null ? Math.round(forecast.reorderPoint) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-400">ngưỡng tối thiểu</p>
                </div>
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Số kỳ dữ liệu</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {forecast.historical?.length || 0}
                  </p>
                  <p className="text-xs text-gray-400">tháng</p>
                </div>
              </div>

              {/* Bar Chart (CSS-based) */}
              {forecast.historical && forecast.historical.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">📊 Lịch sử xuất kho theo tháng</h3>
                  <div className="space-y-3">
                    {forecast.historical.map((h, idx) => {
                      const val = h.totalOut || h.TotalOut || 0;
                      const pct = (val / maxDemand) * 100;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-24 text-right font-mono">
                            {h.month || h.Month || `T${idx + 1}`}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            >
                              {pct > 15 && (
                                <span className="text-xs text-white font-semibold">{val}</span>
                              )}
                            </div>
                          </div>
                          {pct <= 15 && (
                            <span className="text-xs text-gray-600 font-semibold w-10">{val}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw Data Table */}
              {forecast.historical && forecast.historical.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">📋 Dữ liệu chi tiết</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Tháng</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Tổng xuất</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {forecast.historical.map((h, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono">{h.month || h.Month || `Tháng ${idx + 1}`}</td>
                            <td className="px-4 py-2 font-semibold">{h.totalOut || h.TotalOut || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
