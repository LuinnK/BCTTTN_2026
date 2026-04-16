import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import api from '@/services/api';

const EMPTY_FORM = {
  SupplierName: '',
  ContactPerson: '',
  Phone: '',
  Email: '',
  Address: '',
};

export default function Suppliers() {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.getSuppliers();
      setSuppliers(res.data || []);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách nhà cung cấp', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await api.createSupplier({
        SupplierName: form.SupplierName.trim(),
        ContactPerson: form.ContactPerson.trim(),
        Phone: form.Phone.trim(),
        Email: form.Email.trim(),
        Address: form.Address.trim(),
      });
      addToast('Thêm nhà cung cấp thành công!', 'success');
      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadSuppliers();
    } catch (err) {
      addToast(err.message || 'Lỗi thêm nhà cung cấp', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Nhà cung cấp</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Đóng' : '+ Thêm NCC'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card border-2 border-blue-200">
          <h2 className="font-semibold text-gray-700 mb-4">➕ Thêm Nhà cung cấp mới</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp *</label>
              <input
                type="text"
                name="SupplierName"
                value={form.SupplierName}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Tên nhà cung cấp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Người liên hệ</label>
              <input
                type="text"
                name="ContactPerson"
                value={form.ContactPerson}
                onChange={handleChange}
                className="input-field"
                placeholder="Họ và tên"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                name="Phone"
                value={form.Phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Số điện thoại"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="Email"
                value={form.Email}
                onChange={handleChange}
                className="input-field"
                placeholder="Email"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input
                type="text"
                name="Address"
                value={form.Address}
                onChange={handleChange}
                className="input-field"
                placeholder="Địa chỉ"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={formLoading}>
                {formLoading ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Table */}
      <div className="card overflow-hidden">
        <h2 className="font-semibold text-gray-700 mb-4">📋 Danh sách Nhà cung cấp</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Chưa có nhà cung cấp nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tên nhà cung cấp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Người liên hệ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">SĐT</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Địa chỉ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.SupplierID} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-gray-500">{s.SupplierID}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.SupplierName}</td>
                    <td className="px-4 py-3">{s.ContactPerson || '-'}</td>
                    <td className="px-4 py-3">{s.Phone || '-'}</td>
                    <td className="px-4 py-3">{s.Email || '-'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{s.Address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
