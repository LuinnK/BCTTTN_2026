import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/services/api';

export default function Audit() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();

  // Bin lookup
  const [binCode, setBinCode] = useState('');
  const [binData, setBinData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Adjustment form
  const [adjForm, setAdjForm] = useState({
    sku: '',
    binCode: '',
    newQuantity: '',
    reason: '',
  });
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjResult, setAdjResult] = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!binCode.trim()) return;
    setLookupLoading(true);
    setBinData(null);
    try {
      const res = await api.getBinInventory(binCode.trim());
      setBinData(res.data);
    } catch (err) {
      addToast(err.message || 'Không tìm thấy dữ liệu', 'error');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setAdjLoading(true);
    setAdjResult(null);
    try {
      const payload = {
        sku: adjForm.sku,
        binCode: adjForm.binCode,
        actualQty: Number(adjForm.newQuantity),
        reason: adjForm.reason,
      };
      // Backend cần: binCode, sku, expectedQty, actualQty, reason.
      // UI đơn giản: nếu không có expectedQty, backend/DAO nên tự lookup theo bin+sku.
      const res = await api.processAdjustment(payload);
      setAdjResult(res);
      addToast('Điều chỉnh tồn kho thành công!', 'success');
      setAdjForm({ sku: '', binCode: '', newQuantity: '', reason: '' });
    } catch (err) {
      addToast(err.message || 'Lỗi điều chỉnh', 'error');
    } finally {
      setAdjLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Kiểm kho & Điều chỉnh</h1>

      {/* Bin Lookup */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">🔍 Tra cứu vị trí kho (Bin)</h2>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={binCode}
            onChange={(e) => setBinCode(e.target.value)}
            placeholder="Nhập mã Bin (VD: A-01-01)"
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary" disabled={lookupLoading}>
            {lookupLoading ? 'Đang tìm...' : 'Tra cứu'}
          </button>
        </form>

        {binData && (
          <div className="mt-4">
            {Array.isArray(binData) && binData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">SKU</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Tên SP</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Số lô</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">HSD</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {binData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2 font-mono font-medium">{item.sku}</td>
                        <td className="px-4 py-2">{item.name || '-'}</td>
                        <td className="px-4 py-2">{item.batchNo || item.BatchNo || '-'}</td>
                        <td className="px-4 py-2">
                          {item.expiryDate || item.ExpiryDate
                            ? new Date(item.expiryDate || item.ExpiryDate).toLocaleDateString('vi-VN')
                            : '-'}
                        </td>
                        <td className="px-4 py-2 font-semibold">{item.expectedQty ?? item.quantity ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                Vị trí này đang trống hoặc không tồn tại.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjustment */}
      {hasRole('ADMIN', 'MANAGER') && (
        <div className="card border-2 border-yellow-200">
          <h2 className="font-semibold text-gray-700 mb-4">🔧 Điều chỉnh tồn kho</h2>
          <p className="text-sm text-gray-500 mb-4">
            Chỉ dành cho MANAGER / ADMIN. Dùng khi kiểm kho phát hiện chênh lệch.
          </p>
          <form onSubmit={handleAdjust} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                value={adjForm.sku}
                onChange={(e) => setAdjForm({ ...adjForm, sku: e.target.value })}
                required
                className="input-field"
                placeholder="Mã SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã Bin *</label>
              <input
                type="text"
                value={adjForm.binCode}
                onChange={(e) => setAdjForm({ ...adjForm, binCode: e.target.value })}
                required
                className="input-field"
                placeholder="VD: A-01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng thực tế *</label>
              <input
                type="number"
                min="0"
                value={adjForm.newQuantity}
                onChange={(e) => setAdjForm({ ...adjForm, newQuantity: e.target.value })}
                required
                className="input-field"
                placeholder="Số lượng đếm được"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do *</label>
              <input
                type="text"
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                required
                className="input-field"
                placeholder="VD: Kiểm kho định kỳ"
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary bg-yellow-500 hover:bg-yellow-600" disabled={adjLoading}>
                {adjLoading ? 'Đang xử lý...' : '🔧 Xác nhận Điều chỉnh'}
              </button>
            </div>
          </form>

          {adjResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-700">✅ {adjResult.message || 'Điều chỉnh thành công!'}</p>
              {adjResult.data && (
                <pre className="text-xs text-green-600 mt-2 overflow-x-auto">
                  {JSON.stringify(adjResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
