import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import api from '@/services/api';

const EMPTY_FORM = {
  sku: '',
  name: '',
  barcode: '',
  categoryId: '',
  supplierId: '',
  unit: '',
  weight: '',
  rop: '',
};

const normalizeProductResponse = (data) => (Array.isArray(data) ? data[0] : data);

export default function Products() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();

  // Search state
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('search');
  const [suppliers, setSuppliers] = useState([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const nameInputRef = useRef(null);
  const supplierSelectRef = useRef(null);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await api.getSuppliers();
        setSuppliers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        addToast(err.message || 'Không tải được danh sách nhà cung cấp', 'error');
      }
    };

    loadSuppliers();
  }, [addToast]);

  const selectedSupplierName = useMemo(() => {
    if (!product?.supplier_id) return 'N/A';
    return suppliers.find((item) => item.SupplierID === product.supplier_id)?.SupplierName || `ID: ${product.supplier_id}`;
  }, [product, suppliers]);

  const searchProduct = async (value) => {
    if (!value.trim()) return;
    setSearchLoading(true);
    setProduct(null);
    try {
      const res = await api.getProductByBarcode(value.trim());
      setProduct(normalizeProductResponse(res.data));
    } catch (err) {
      addToast(err.message || 'Không tìm thấy sản phẩm', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    await searchProduct(barcode);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setIsEdit(false);
    setShowForm(true);
  };

  const openEdit = () => {
    if (!product) return;
    setForm({
      id: product.id,
      sku: product.sku || '',
      name: product.name || '',
      barcode: product.barcode || '',
      categoryId: product.category_id ?? '',
      supplierId: product.supplier_id ?? '',
      unit: product.unit || '',
      weight: product.weight ?? '',
      rop: product.rop ?? '',
    });
    setIsEdit(true);
    setShowForm(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openScanner = (target) => {
    setScannerTarget(target);
    setScannerOpen(true);
  };

  const focusNextFieldAfterScan = (nextForm) => {
    window.setTimeout(() => {
      if (!nextForm.name.trim()) {
        nameInputRef.current?.focus();
        return;
      }

      supplierSelectRef.current?.focus();
    }, 0);
  };

  const fillFormFromProduct = (scannedBarcode, foundProduct) => {
    const normalizedProduct = normalizeProductResponse(foundProduct);
    if (!normalizedProduct) return;

    const nextForm = {
      sku: normalizedProduct.sku || '',
      name: normalizedProduct.name || '',
      barcode: normalizedProduct.barcode || scannedBarcode,
      categoryId: normalizedProduct.category_id ?? '',
      supplierId: normalizedProduct.supplier_id ?? '',
      unit: normalizedProduct.unit || '',
      weight: normalizedProduct.weight ?? '',
      rop: normalizedProduct.rop ?? '',
    };

    setForm(nextForm);
    focusNextFieldAfterScan(nextForm);
    addToast('Đã tự điền thông tin từ barcode có sẵn trong hệ thống.', 'success');
  };

  const handleFormScan = async (scannedBarcode) => {
    const trimmedBarcode = scannedBarcode.trim();
    if (!trimmedBarcode) return;

    if (isEdit) {
      setForm((prev) => {
        const nextForm = { ...prev, barcode: trimmedBarcode };
        focusNextFieldAfterScan(nextForm);
        return nextForm;
      });
      return;
    }

    try {
      const res = await api.getProductByBarcode(trimmedBarcode);
      fillFormFromProduct(trimmedBarcode, res.data);
    } catch {
      setForm((prev) => {
        const nextForm = { ...prev, barcode: trimmedBarcode };
        focusNextFieldAfterScan(nextForm);
        return nextForm;
      });
      addToast('Chưa có sản phẩm cho barcode này, bạn có thể nhập mới.', 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        rop: form.rop ? Number(form.rop) : undefined,
      };
      if (isEdit) {
        await api.updateProduct(payload.id, payload);
        addToast('Cập nhật sản phẩm thành công!', 'success');
      } else {
        await api.createProduct(payload);
        addToast('Thêm sản phẩm thành công!', 'success');
      }
      setShowForm(false);
      // Refresh if editing current product
      if (barcode.trim()) {
        const res = await api.getProductByBarcode(barcode.trim());
        setProduct(normalizeProductResponse(res.data));
      }
    } catch (err) {
      addToast(err.message || 'Lỗi xử lý', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm ${product.sku}?`)) return;
    try {
      await api.deleteProduct(product.id);
      addToast('Đã xóa sản phẩm!', 'success');
      setProduct(null);
      setBarcode('');
    } catch (err) {
      addToast(err.message || 'Lỗi xóa sản phẩm', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Sản phẩm</h1>
        {hasRole('ADMIN', 'MANAGER') && (
          <button onClick={openCreate} className="btn-primary">
            + Thêm sản phẩm
          </button>
        )}
      </div>

      {/* Search */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">🔍 Tra cứu theo Barcode</h2>
        <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Nhập mã barcode..."
            className="input-field flex-1"
          />
          <button type="button" className="rounded-lg border border-blue-200 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-50" onClick={() => openScanner('search')}>
            Quét bằng camera
          </button>
          <button type="submit" className="btn-primary" disabled={searchLoading}>
            {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </form>
      </div>

      {/* Product Detail */}
      {product && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">📦 Thông tin sản phẩm</h2>
            {hasRole('ADMIN', 'MANAGER') && (
              <div className="flex gap-2">
                <button onClick={openEdit} className="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition">
                  ✏️ Sửa
                </button>
                <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                  🗑️ Xóa
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['SKU', product.sku],
              ['Tên sản phẩm', product.name],
              ['Barcode', product.barcode],
              ['Nhà cung cấp', selectedSupplierName],
              ['Đơn vị', product.unit],
              ['Điểm đặt hàng lại (ROP)', product.rop],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500 w-40">{label}:</span>
                <span className="text-sm font-medium text-gray-800">{value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {isEdit ? '✏️ Cập nhật sản phẩm' : '➕ Thêm sản phẩm mới'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { name: 'sku', label: 'SKU', type: 'text', required: true, disabled: isEdit },
                  { name: 'name', label: 'Tên sản phẩm', type: 'text', required: true },
                  { name: 'categoryId', label: 'Category ID', type: 'number' },
                  { name: 'unit', label: 'Đơn vị', type: 'text' },
                  { name: 'weight', label: 'Trọng lượng (kg)', type: 'number' },
                  { name: 'rop', label: 'Điểm đặt hàng lại (ROP)', type: 'number' },
                ].map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input
                      ref={f.name === 'name' ? nameInputRef : undefined}
                      type={f.type}
                      name={f.name}
                      value={form[f.name]}
                      onChange={handleFormChange}
                      required={f.required}
                      disabled={f.disabled}
                      className="input-field"
                      step={f.type === 'number' ? 'any' : undefined}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      type="text"
                      name="barcode"
                      value={form.barcode}
                      onChange={handleFormChange}
                      required
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => openScanner('form')}
                      className="rounded-lg border border-blue-200 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      Quét camera
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                  <select
                    ref={supplierSelectRef}
                    name="supplierId"
                    value={form.supplierId}
                    onChange={handleFormChange}
                    className="input-field"
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.SupplierID} value={supplier.SupplierID}>
                        {supplier.SupplierName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1" disabled={formLoading}>
                    {formLoading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(value) => {
          if (scannerTarget === 'form') {
            handleFormScan(value);
            return;
          }

          setBarcode(value);
          searchProduct(value);
        }}
        title={scannerTarget === 'form' ? 'Quét barcode cho form sản phẩm' : 'Quét barcode sản phẩm bằng camera'}
      />
    </div>
  );
}
