import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

const EMPTY_FORM = {
  orderCode: '',
  type: 'SALE',
  lines: [{ sku: '', quantity: 1 }],
};

// Helper để tự động lấy đúng tên trường dù DB trả về kiểu chữ nào
const normalizeOrder = (o) => {
  if (!o) return {};
  return {
    id: o.id ?? o.ID ?? o.OrderID ?? o.orderId,
    orderCode: o.order_code ?? o.orderCode ?? o.OrderCode ?? o.OrderNo ?? '-',
    type: o.type ?? o.Type ?? o.OrderType ?? '-',
    status: o.status ?? o.Status ?? 'PENDING',
    createdAt: o.created_at ?? o.createdAt ?? o.CreatedAt ?? o.OrderDate ?? new Date()
  };
};

const normalizeLine = (l) => {
  if (!l) return {};
  return {
    sku: l.sku ?? l.SKU ?? l.product_sku ?? l.ProductSKU ?? '-',
    name: l.name ?? l.Name ?? l.product_name ?? l.ProductName ?? '-',
    quantity: l.quantity ?? l.Quantity ?? l.qty ?? l.Qty ?? 0
  };
};

export default function Orders() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewingOrder, setViewingOrder] = useState(null); // Để xem chi tiết

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders();
      setOrders(res.data || []);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách đơn hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...form.lines];
    newLines[index][field] = value;
    setForm({ ...form, lines: newLines });
  };

  const addLine = () => {
    setForm({ ...form, lines: [...form.lines, { sku: '', quantity: 1 }] });
  };

  const removeLine = (index) => {
    const newLines = form.lines.filter((_, i) => i !== index);
    setForm({ ...form, lines: newLines });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      // transform sku to product logic - but our backend is expecting product_id
      // Wait, our backend createOrder expects lines: [{ productId, quantity }]
      // But user inputs SKU. We need to fetch product ID by SKU first.
      const linesWithIds = [];
      for (const line of form.lines) {
        if (!line.sku || line.quantity < 1) throw new Error('Vui lòng nhập SKU và số lượng hợp lệ');
        // Get product by barcode/sku
        const pRes = await api.getProductByBarcode(line.sku);
       if (!pRes.data) throw new Error(`Không tìm thấy sản phẩm mã ${line.sku}`);
        linesWithIds.push({
          productId: pRes.data.id,
          quantity: parseInt(line.quantity, 10)
        });
      }

      await api.createOrder({
        orderCode: form.orderCode.trim(),
        type: form.type,
        lines: linesWithIds,
      });

      addToast('Tạo đơn hàng thành công!', 'success');
      setShowForm(false);
      setForm(EMPTY_FORM);
      loadOrders();
    } catch (err) {
      addToast(err.message || 'Lỗi tạo đơn hàng', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const viewDetails = async (id) => {
    try {
      const res = await api.getOrderDetails(id);
      setViewingOrder(res.data);
    } catch (err) {
      addToast(err.message || 'Lỗi tải chi tiết đơn hàng', 'error');
    }
  };

  const allocateOrder = async (id) => {
    if (!window.confirm('Hệ thống sẽ tự động tìm kiếm tồn kho FEFO và tạo các yêu cầu xuất kho tương ứng. Bạn có chắc chắn muốn xử lý đơn hàng này?')) return;
    try {
      await api.allocateOrder(id);
      addToast('Đã tạo thành công các yêu cầu xuất kho cho đơn hàng!', 'success');
      setViewingOrder(null);
      loadOrders();
    } catch (err) {
      addToast(err.message || 'Lỗi xử lý đơn hàng', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đơn Hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách và xử lý xuất kho theo đơn hàng</p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setShowForm(true);
            setViewingOrder(null);
          }}
          className="btn btn-primary"
        >
          + Tạo Đơn Hàng
        </button>
      </div>

      {showForm && (
        <div className="card border-2 border-blue-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tạo Đơn Hàng Mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Đơn Hàng *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={form.orderCode}
                  onChange={(e) => setForm({ ...form, orderCode: e.target.value })}
                  placeholder="VD: ORD-202310-01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại Đơn</label>
                <select
                  className="input-field"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="SALE">Bán hàng (SALE)</option>
                  <option value="PURCHASE">Mua hàng (PURCHASE)</option>
                </select>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Chi tiết sản phẩm</h3>
                <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  + Thêm dòng
                </button>
              </div>
              
              <div className="space-y-3">
                {form.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Nhập mã SKU"
                      className="input-field flex-1"
                      value={line.sku}
                      onChange={(e) => handleLineChange(idx, 'sku', e.target.value)}
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      className="input-field w-24"
                      value={line.quantity}
                      onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                    />
                    {form.lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 px-2">
                        Xóa
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button type="submit" disabled={formLoading} className="btn btn-primary min-w-[120px]">
                {formLoading ? 'Đang lưu...' : 'Lưu Đơn Hàng'}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewingOrder && (
        (() => {
          const orderData = normalizeOrder(viewingOrder.order || viewingOrder);
          const linesData = (viewingOrder.lines || viewingOrder.OrderLines || viewingOrder.details || []).map(normalizeLine);
          return (
            <div className="card border-2 border-indigo-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-indigo-900">Chi Tiết Đơn Hàng: {orderData.orderCode}</h2>
                <button onClick={() => setViewingOrder(null)} className="text-gray-500 hover:text-gray-700">Đóng</button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Mã đơn</p>
                  <p className="font-semibold">{orderData.orderCode}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Loại</p>
                  <p className="font-semibold">{orderData.type}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Trạng thái</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    orderData.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    orderData.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                    orderData.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {orderData.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Ngày tạo</p>
                  <p className="font-semibold">{new Date(orderData.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <h3 className="font-semibold text-gray-800 mb-2">Danh sách sản phẩm</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">Mã SKU</th>
                      <th className="px-4 py-3">Tên Sản Phẩm</th>
                      <th className="px-4 py-3 text-right">Số lượng yêu cầu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {linesData.map((line, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{line.sku}</td>
                        <td className="px-4 py-3">{line.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">{line.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {orderData.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => allocateOrder(orderData.id)}
                    className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Xử lý xuất kho (Cấp phát tự động)
                  </button>
                </div>
              )}
            </div>
          );
        })()
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Chưa có đơn hàng nào</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Mã Đơn Hàng</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3">Ngày Tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map((rawOrder) => {
                  const o = normalizeOrder(rawOrder);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{o.orderCode}</td>
                      <td className="px-4 py-3">{o.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          o.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          o.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => viewDetails(o.id)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}