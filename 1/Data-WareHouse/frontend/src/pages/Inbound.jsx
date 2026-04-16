import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import api from '@/services/api';

export default function Inbound() {
  const { addToast } = useToast();

  // Inbound form
  const [inForm, setInForm] = useState({
    barcode: '',
    binCode: '',
    quantity: '',
    batchNo: '',
    expiryDate: '',
  });
  const [inLoading, setInLoading] = useState(false);
  const [inResult, setInResult] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Transfer form
  const [trForm, setTrForm] = useState({
    sku: '',
    sourceBin: '',
    destBin: '',
    quantity: '',
  });
  const [trLoading, setTrLoading] = useState(false);
  const [trResult, setTrResult] = useState(null);

  const [activeTab, setActiveTab] = useState('inbound');

  const handleInbound = async (e) => {
    e.preventDefault();
    setInLoading(true);
    setInResult(null);
    try {
      const payload = {
        barcode: inForm.barcode,
        binCode: inForm.binCode,
        quantity: Number(inForm.quantity),
        batchNo: inForm.batchNo || undefined,
        expiryDate: inForm.expiryDate || undefined,
      };
      const res = await api.inboundScan(payload);
      setInResult(res);
      addToast('Nhập kho thành công!', 'success');
      setInForm({ barcode: '', binCode: '', quantity: '', batchNo: '', expiryDate: '' });
    } catch (err) {
      addToast(err.message || 'Lỗi nhập kho', 'error');
    } finally {
      setInLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTrLoading(true);
    setTrResult(null);
    try {
      const payload = {
        sku: trForm.sku,
        sourceBin: trForm.sourceBin,
        destBin: trForm.destBin,
        quantity: Number(trForm.quantity),
      };
      const res = await api.transferStock(payload);
      setTrResult(res);
      addToast('Chuyển kho thành công!', 'success');
      setTrForm({ sku: '', sourceBin: '', destBin: '', quantity: '' });
    } catch (err) {
      addToast(err.message || 'Lỗi chuyển kho', 'error');
    } finally {
      setTrLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Nhập kho & Chuyển kho</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('inbound')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'inbound' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📥 Nhập kho (Inbound)
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'transfer' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔄 Chuyển kho (Transfer)
        </button>
      </div>

      {/* Inbound Tab */}
      {activeTab === 'inbound' && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">📥 Quét nhập kho</h2>
          <form onSubmit={handleInbound} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode *</label>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  type="text"
                  value={inForm.barcode}
                  onChange={(e) => setInForm({ ...inForm, barcode: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Quét hoặc nhập barcode"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="rounded-lg border border-blue-200 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-50"
                >
                  Quét camera
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã vị trí (Bin) *</label>
              <input
                type="text"
                value={inForm.binCode}
                onChange={(e) => setInForm({ ...inForm, binCode: e.target.value })}
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
                value={inForm.quantity}
                onChange={(e) => setInForm({ ...inForm, quantity: e.target.value })}
                required
                className="input-field"
                placeholder="Số lượng nhập"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lô (Batch)</label>
              <input
                type="text"
                value={inForm.batchNo}
                onChange={(e) => setInForm({ ...inForm, batchNo: e.target.value })}
                className="input-field"
                placeholder="VD: BATCH-2025-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
              <input
                type="date"
                value={inForm.expiryDate}
                onChange={(e) => setInForm({ ...inForm, expiryDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={inLoading}>
                {inLoading ? 'Đang xử lý...' : '📥 Nhập kho'}
              </button>
            </div>
          </form>

          {inResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-700">✅ {inResult.message || 'Nhập kho thành công!'}</p>
              {inResult.data && (
                <pre className="text-xs text-green-600 mt-2 overflow-x-auto">
                  {JSON.stringify(inResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">🔄 Chuyển kho nội bộ</h2>
          <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input
                type="text"
                value={trForm.sku}
                onChange={(e) => setTrForm({ ...trForm, sku: e.target.value })}
                required
                className="input-field"
                placeholder="Mã SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
              <input
                type="number"
                min="1"
                value={trForm.quantity}
                onChange={(e) => setTrForm({ ...trForm, quantity: e.target.value })}
                required
                className="input-field"
                placeholder="Số lượng chuyển"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin nguồn *</label>
              <input
                type="text"
                value={trForm.sourceBin}
                onChange={(e) => setTrForm({ ...trForm, sourceBin: e.target.value })}
                required
                className="input-field"
                placeholder="VD: A-01-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bin đích *</label>
              <input
                type="text"
                value={trForm.destBin}
                onChange={(e) => setTrForm({ ...trForm, destBin: e.target.value })}
                required
                className="input-field"
                placeholder="VD: B-02-03"
              />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary" disabled={trLoading}>
                {trLoading ? 'Đang xử lý...' : '🔄 Chuyển kho'}
              </button>
            </div>
          </form>

          {trResult && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-700">✅ {trResult.message || 'Chuyển kho thành công!'}</p>
              {trResult.data && (
                <pre className="text-xs text-green-600 mt-2 overflow-x-auto">
                  {JSON.stringify(trResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => setInForm((prev) => ({ ...prev, barcode: value }))}
        title="Quét barcode nhập kho bằng camera"
      />
    </div>
  );
}
