import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import api from '@/services/api';

export default function Outbound() {
  const { addToast } = useToast();

  // FEFO Suggest
  const [suggestSku, setSuggestSku] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Confirm outbound
  const [confirmForm, setConfirmForm] = useState({
    sku: '',
    binCode: '',
    quantity: '',
    reason: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);

  const handleSuggest = async (e) => {
    e.preventDefault();
    if (!suggestSku.trim()) return;
    setSuggestLoading(true);
    setSuggestions(null);
    try {
      const res = await api.suggestOutbound(suggestSku.trim());
      setSuggestions(res.data);
    } catch (err) {
      addToast(err.message || 'Không tìm thấy gợi ý', 'error');
    } finally {
      setSuggestLoading(false);
    }
  };

  const pickSuggestion = (item) => {
    setConfirmForm({
      sku: suggestSku,
      binCode: item.BinCode || item.binCode || item.bin_code || '',
      quantity: '',
      reason: '',
    });
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setConfirmLoading(true);
    setConfirmResult(null);
    try {
      const payload = {
        sku: confirmForm.sku,
        binCode: confirmForm.binCode,
        quantity: Number(confirmForm.quantity),
        reason: confirmForm.reason || undefined,
      };
      const res = await api.confirmOutbound(payload);
      setConfirmResult(res);
      addToast('Xuất kho thành công!', 'success');
      setConfirmForm({ sku: '', binCode: '', quantity: '', reason: '' });
    } catch (err) {
      addToast(err.message || 'Lỗi xuất kho', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Xuất kho (Outbound)</h1>

      {/* FEFO Suggestion */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">🔍 Gợi ý lấy hàng (FEFO)</h2>
        <p className="text-sm text-gray-500 mb-3">
          Hệ thống gợi ý vị trí lấy hàng theo nguyên tắc FEFO (First Expired, First Out).
        </p>
        <form onSubmit={handleSuggest} className="flex gap-3">
          <input
            type="text"
            value={suggestSku}
            onChange={(e) => setSuggestSku(e.target.value)}
            placeholder="Nhập mã SKU..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary" disabled={suggestLoading}>
            {suggestLoading ? 'Đang tìm...' : 'Gợi ý'}
          </button>
        </form>

        {suggestions && (
          <div className="mt-4">
            {Array.isArray(suggestions) && suggestions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Vị trí (Bin)</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Số lô</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Hạn sử dụng</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">SL có sẵn</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suggestions.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-2 font-mono font-medium">
                          {item.BinCode || item.binCode || item.bin_code || '-'}
                        </td>
                        <td className="px-4 py-2">{item.BatchNo || item.batchNo || item.batch_no || '-'}</td>
                        <td className="px-4 py-2">
                          {item.ExpiryDate || item.expiryDate || item.expiry_date
                            ? new Date(item.ExpiryDate || item.expiryDate || item.expiry_date).toLocaleDateString('vi-VN')
                            : '-'}
                        </td>
                        <td className="px-4 py-2 font-semibold">{item.Quantity || item.quantity}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => pickSuggestion(item)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Chọn ↓
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">Không có dữ liệu gợi ý.</div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Outbound */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">📤 Xác nhận Xuất kho</h2>
        <form onSubmit={handleConfirm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input
              type="text"
              value={confirmForm.sku}
              onChange={(e) => setConfirmForm({ ...confirmForm, sku: e.target.value })}
              required
              className="input-field"
              placeholder="Mã SKU"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã vị trí (Bin) *</label>
            <input
              type="text"
              value={confirmForm.binCode}
              onChange={(e) => setConfirmForm({ ...confirmForm, binCode: e.target.value })}
              required
              className="input-field"
              placeholder="VD: A-01-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng xuất *</label>
            <input
              type="number"
              min="1"
              value={confirmForm.quantity}
              onChange={(e) => setConfirmForm({ ...confirmForm, quantity: e.target.value })}
              required
              className="input-field"
              placeholder="Số lượng cần xuất"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
            <input
              type="text"
              value={confirmForm.reason}
              onChange={(e) => setConfirmForm({ ...confirmForm, reason: e.target.value })}
              className="input-field"
              placeholder="Lý do xuất kho (tùy chọn)"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={confirmLoading}>
              {confirmLoading ? 'Đang xử lý...' : '📤 Xác nhận Xuất kho'}
            </button>
          </div>
        </form>

        {confirmResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="font-semibold text-green-700">✅ {confirmResult.message || 'Xuất kho thành công!'}</p>
            {confirmResult.data && (
              <pre className="text-xs text-green-600 mt-2 overflow-x-auto">
                {JSON.stringify(confirmResult.data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
