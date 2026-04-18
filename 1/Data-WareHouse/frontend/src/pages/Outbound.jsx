import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

export default function Outbound() {
  const { addToast } = useToast();
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canApprove = hasRole('ADMIN', 'MANAGER');

  const tabFromUrl = searchParams.get('tab') === 'approvals' && canApprove ? 'approvals' : 'request';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const t = searchParams.get('tab') === 'approvals' && canApprove ? 'approvals' : 'request';
    setActiveTab(t);
  }, [searchParams, canApprove]);

  const setTab = (t) => {
    setActiveTab(t);
    if (t === 'approvals' && canApprove) setSearchParams({ tab: 'approvals' });
    else setSearchParams({});
  };

  // FEFO Suggest
  const [suggestSku, setSuggestSku] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Gửi yêu cầu
  const [reqForm, setReqForm] = useState({ sku: '', binCode: '', quantity: '', reason: '' });
  const [reqLoading, setReqLoading] = useState(false);

  // Yêu cầu của tôi
  const [myRequests, setMyRequests] = useState([]);
  const [myReqLoading, setMyReqLoading] = useState(false);

  // Xác nhận xuất kho
  const [confirmForm, setConfirmForm] = useState({
    requestId: '',
    sku: '',
    binCode: '',
    quantity: '',
    reason: '',
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);

  // Duyệt (admin)
  const [pendingList, setPendingList] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState({});

  const loadMyRequests = useCallback(async () => {
    setMyReqLoading(true);
    try {
      const res = await api.getMyOutboundRequests();
      setMyRequests(res.data || []);
    } catch (err) {
      addToast(err.message || 'Không tải được yêu cầu', 'error');
    } finally {
      setMyReqLoading(false);
    }
  }, [addToast]);

  const loadPending = useCallback(async () => {
    if (!canApprove) return;
    setPendingLoading(true);
    try {
      const res = await api.getOutboundRequestsForApproval('PENDING');
      setPendingList(res.data || []);
    } catch (err) {
      addToast(err.message || 'Không tải danh sách chờ duyệt', 'error');
    } finally {
      setPendingLoading(false);
    }
  }, [addToast, canApprove]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  useEffect(() => {
    if (activeTab === 'approvals' && canApprove) loadPending();
  }, [activeTab, canApprove, loadPending]);

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
    const bin = item.BinCode || item.binCode || item.bin_code || '';
    setReqForm((f) => ({ ...f, sku: suggestSku, binCode: bin }));
    setConfirmForm((f) => ({ ...f, sku: suggestSku, binCode: bin }));
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setReqLoading(true);
    try {
      await api.createOutboundRequest({
        sku: reqForm.sku.trim(),
        binCode: reqForm.binCode.trim(),
        quantity: Number(reqForm.quantity),
        reason: reqForm.reason || undefined,
      });
      addToast('Đã gửi yêu cầu — chờ quản lý duyệt.', 'success');
      setReqForm({ sku: '', binCode: '', quantity: '', reason: '' });
      loadMyRequests();
    } catch (err) {
      addToast(err.message || 'Gửi yêu cầu thất bại', 'error');
    } finally {
      setReqLoading(false);
    }
  };

  const fillConfirmFromRequest = (row) => {
    setConfirmForm({
      requestId: String(row.id),
      sku: row.sku,
      binCode: row.bin_code,
      quantity: String(row.quantity),
      reason: row.reason || '',
    });
    setTab('confirm');
    addToast('Đã điền form xác nhận — kiểm tra và bấm xác nhận xuất kho.', 'success');
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setConfirmLoading(true);
    setConfirmResult(null);
    try {
      const payload = {
        sku: confirmForm.sku.trim(),
        binCode: confirmForm.binCode.trim(),
        quantity: Number(confirmForm.quantity),
        reason: confirmForm.reason || undefined,
      };
      if (confirmForm.requestId) {
        payload.requestId = Number(confirmForm.requestId);
      }
      const res = await api.confirmOutbound(payload);
      setConfirmResult(res);
      addToast('Xuất kho thành công!', 'success');
      setConfirmForm({ requestId: '', sku: '', binCode: '', quantity: '', reason: '' });
      loadMyRequests();
      if (canApprove) loadPending();
    } catch (err) {
      addToast(err.message || 'Lỗi xuất kho', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approveOutboundRequest(id);
      addToast('Đã duyệt.', 'success');
      loadPending();
      loadMyRequests();
    } catch (err) {
      addToast(err.message || 'Lỗi duyệt', 'error');
    }
  };

  const handleReject = async (id) => {
    const note = rejectNote[id] || '';
    try {
      await api.rejectOutboundRequest(id, note);
      addToast('Đã từ chối yêu cầu.', 'success');
      setRejectNote((m) => ({ ...m, [id]: '' }));
      loadPending();
      loadMyRequests();
    } catch (err) {
      addToast(err.message || 'Lỗi từ chối', 'error');
    }
  };

  const statusBadge = (s) => {
    const map = {
      PENDING: 'bg-amber-100 text-amber-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-gray-100 text-gray-700',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Xuất kho (Outbound)</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'request', label: 'Gửi yêu cầu xuất' },
          { id: 'mine', label: 'Yêu cầu của tôi' },
          { id: 'confirm', label: 'Xác nhận xuất kho' },
          ...(canApprove ? [{ id: 'approvals', label: 'Duyệt yêu cầu' }] : []),
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'request' && (
        <>
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-4">🔍 Gợi ý lấy hàng (FEFO)</h2>
            <p className="text-sm text-gray-500 mb-3">
              Gợi ý vị trí theo FEFO. Chọn dòng để điền vào form gửi yêu cầu bên dưới.
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
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Bin</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Số lô</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">Hạn SD</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-600">SL</th>
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
                                ? new Date(
                                    item.ExpiryDate || item.expiryDate || item.expiry_date
                                  ).toLocaleDateString('vi-VN')
                                : '-'}
                            </td>
                            <td className="px-4 py-2 font-semibold">{item.Quantity || item.quantity}</td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
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

          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-2">📨 Gửi yêu cầu xuất kho</h2>
            <p className="text-sm text-gray-500 mb-4">
              Nhân viên gửi yêu cầu — hệ thống <strong>chưa trừ tồn</strong>. Sau khi quản lý duyệt, bạn dùng tab
              &quot;Xác nhận xuất kho&quot; để hoàn tất.
            </p>
            <form onSubmit={submitRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <input
                  type="text"
                  value={reqForm.sku}
                  onChange={(e) => setReqForm({ ...reqForm, sku: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Mã SKU"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã vị trí (Bin) *</label>
                <input
                  type="text"
                  value={reqForm.binCode}
                  onChange={(e) => setReqForm({ ...reqForm, binCode: e.target.value })}
                  required
                  className="input-field"
                  placeholder="VD: A-01-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
                <input
                  type="number"
                  min="1"
                  value={reqForm.quantity}
                  onChange={(e) => setReqForm({ ...reqForm, quantity: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                <input
                  type="text"
                  value={reqForm.reason}
                  onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                  className="input-field"
                  placeholder="Tùy chọn"
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn-primary" disabled={reqLoading}>
                  {reqLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {activeTab === 'mine' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-700">📋 Yêu cầu của tôi</h2>
            <button type="button" onClick={loadMyRequests} className="text-sm text-blue-600 hover:underline" disabled={myReqLoading}>
              {myReqLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-sm">Chưa có yêu cầu nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">SKU</th>
                    <th className="text-left px-3 py-2">Bin</th>
                    <th className="text-left px-3 py-2">SL</th>
                    <th className="text-left px-3 py-2">Trạng thái</th>
                    <th className="text-left px-3 py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myRequests.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-mono">{row.id}</td>
                      <td className="px-3 py-2">{row.sku}</td>
                      <td className="px-3 py-2 font-mono">{row.bin_code}</td>
                      <td className="px-3 py-2">{row.quantity}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => fillConfirmFromRequest(row)}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Điền form xác nhận xuất →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'confirm' && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-2">📤 Xác nhận xuất kho (trừ tồn)</h2>
          <p className="text-sm text-gray-500 mb-4">
            {canApprove ? (
              <>
                <strong>Admin / Quản lý:</strong> có thể xác nhận trực tiếp (không cần mã yêu cầu). Để trống mã yêu
                cầu nếu xuất không qua quy trình duyệt.
              </>
            ) : (
              <>
                <strong>Nhân viên:</strong> chỉ xuất được khi đã có yêu cầu <span className="text-green-700">đã duyệt</span>.
                Nhập đúng mã yêu cầu và thông tin đã duyệt.
              </>
            )}
          </p>
          <form onSubmit={handleConfirm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!canApprove && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu (requestId) *</label>
                <input
                  type="number"
                  min="1"
                  value={confirmForm.requestId}
                  onChange={(e) => setConfirmForm({ ...confirmForm, requestId: e.target.value })}
                  required={!canApprove}
                  className="input-field"
                  placeholder="ID từ danh sách yêu cầu đã duyệt"
                />
              </div>
            )}
            {canApprove && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu (tùy chọn)</label>
                <input
                  type="number"
                  min="1"
                  value={confirmForm.requestId}
                  onChange={(e) => setConfirmForm({ ...confirmForm, requestId: e.target.value })}
                  className="input-field"
                  placeholder="Bỏ trống nếu xuất trực tiếp"
                />
              </div>
            )}
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
              <input
                type="text"
                value={confirmForm.reason}
                onChange={(e) => setConfirmForm({ ...confirmForm, reason: e.target.value })}
                className="input-field"
                placeholder="Tùy chọn"
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
      )}

      {activeTab === 'approvals' && canApprove && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-700">✅ Duyệt yêu cầu xuất kho</h2>
            <button type="button" onClick={loadPending} className="text-sm text-blue-600 hover:underline" disabled={pendingLoading}>
              {pendingLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
          {pendingList.length === 0 ? (
            <p className="text-gray-500 text-sm">Không có yêu cầu chờ duyệt.</p>
          ) : (
            <div className="space-y-4">
              {pendingList.map((row) => (
                <div
                  key={row.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-end gap-4"
                >
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">ID</span>
                      <p className="font-mono font-semibold">{row.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Người gửi</span>
                      <p>{row.requester_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">SKU / Bin</span>
                      <p>
                        {row.sku} / <span className="font-mono">{row.bin_code}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Số lượng</span>
                      <p className="font-semibold">{row.quantity}</p>
                    </div>
                    {row.reason && (
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-gray-500">Lý do: </span>
                        {row.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Ghi chú khi từ chối..."
                      value={rejectNote[row.id] || ''}
                      onChange={(e) => setRejectNote((m) => ({ ...m, [row.id]: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary flex-1 text-sm py-2" onClick={() => handleApprove(row.id)}>
                        Duyệt
                      </button>
                      <button
                        type="button"
                        className="flex-1 text-sm py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(row.id)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
