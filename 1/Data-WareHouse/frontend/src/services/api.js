const API_BASE = '/api/v1';

class ApiService {
  constructor() {
    this._getToken = () => localStorage.getItem('wh_token');
  }

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = this._getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  async _request(method, endpoint, body = null) {
    const options = { method, headers: this._headers() };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    if (res.status === 401) {
      localStorage.removeItem('wh_token');
      localStorage.removeItem('wh_user');
      window.location.href = '/login';
      throw new Error('Phiên đăng nhập đã hết hạn');
    }

    if (data.status === 'error') throw new Error(data.message);
    return data;
  }

  // Auth
  login(username, password) {
    return this._request('POST', '/auth/login', { username, password });
  }

  // Products
  getProductByBarcode(barcode) {
    return this._request('GET', `/products/barcode/${encodeURIComponent(barcode)}`);
  }
  createProduct(product) {
    return this._request('POST', '/products', product);
  }
  updateProduct(id, data) {
    return this._request('PUT', `/products/${id}`, data);
  }
  deleteProduct(id) {
    return this._request('DELETE', `/products/${id}`);
  }

  // Suppliers
  getSuppliers() {
    return this._request('GET', '/suppliers');
  }
  createSupplier(supplier) {
    return this._request('POST', '/suppliers', supplier);
  }

  // Inventory
  processInbound(data) {
    return this._request('POST', '/inventory/inbound', data);
  }
  processTransfer(data) {
    return this._request('POST', '/inventory/transfer', data);
  }
  inboundScan(data) {
    return this.processInbound(data);
  }
  transferStock(data) {
    return this.processTransfer(data);
  }

  // Outbound
  getPickingSuggestion(sku) {
    return this._request('GET', `/outbound/suggest/${encodeURIComponent(sku)}`);
  }
  suggestOutbound(sku) {
    return this.getPickingSuggestion(sku);
  }
  processOutbound(data) {
    return this._request('POST', '/outbound/confirm', data);
  }
  confirmOutbound(data) {
    return this.processOutbound(data);
  }

  // Audit
  getBinInventory(binCode) {
    return this._request('GET', `/audit/bin/${encodeURIComponent(binCode)}`);
  }
  processAdjustment(data) {
    return this._request('POST', '/audit/adjust', data);
  }

  // Analytics
  runForecast(sku, alpha = 0.3) {
    return this._request('GET', `/analytics/forecast/${encodeURIComponent(sku)}?alpha=${alpha}`);
  }
  getForecast(sku, alpha = 0.3) {
    return this.runForecast(sku, alpha);
  }
  getDashboardSummary() {
    return this._request('GET', '/analytics/summary');
  }

  getLowStockList(limit = 20) {
    const q = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
    return this._request('GET', `/analytics/low-stock${q}`);
  }
}

export default new ApiService();
