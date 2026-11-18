// ชั้นเรียก API กลาง: ทุกหน้าเรียกข้อมูลผ่านไฟล์นี้ (ข้อมูลจริงอยู่ที่เซิร์ฟเวอร์ server/db.json)
const BASE_URL = '/api';
const TOKEN_KEY = 'suki-token';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ให้ AuthContext รู้เมื่อ token หมดอายุ (401) เพื่อพากลับหน้า login
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต หรือว่ารัน npm run dev แล้ว', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onUnauthorized();
    const fallback = res.status === 404 ? 'ไม่พบข้อมูลที่ต้องการ' : `เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`;
    throw new ApiError(data?.error || fallback, res.status);
  }
  return data;
}

const query = (params = {}) => {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  return clean.length ? `?${new URLSearchParams(clean)}` : '';
};

export const api = {
  // เข้าสู่ระบบ
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // หมวดหมู่ & เมนู
  getCategories: () => request('/categories'),
  getMenu: () => request('/menu'),
  createMenuItem: (item) => request('/menu', { method: 'POST', body: item }),
  updateMenuItem: (id, changes) => request(`/menu/${id}`, { method: 'PATCH', body: changes }),
  deleteMenuItem: (id) => request(`/menu/${id}`, { method: 'DELETE' }),

  // โต๊ะ
  getTables: () => request('/tables'),
  getTable: (id) => request(`/tables/${encodeURIComponent(id)}`),
  createTable: (table) => request('/tables', { method: 'POST', body: table }),
  deleteTable: (id) => request(`/tables/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  checkout: (id) => request(`/tables/${encodeURIComponent(id)}/checkout`, { method: 'POST' }),

  // ออร์เดอร์ (เรียงใหม่สุดก่อน) — ส่งแค่ menuId + qty เซิร์ฟเวอร์คิดราคาเอง
  getOrders: (params) => request(`/orders${query({ _sort: 'createdAt', _order: 'desc', ...params })}`),
  createOrder: ({ tableId, items, note }) => request('/orders', { method: 'POST', body: { tableId, items, note } }),
  updateOrderStatus: (id, status) => request(`/orders/${id}`, { method: 'PATCH', body: { status } }),

  // คำขอจากโต๊ะ: เรียกพนักงาน / เช็กบิล
  getRequests: (params) => request(`/requests${query({ _sort: 'createdAt', _order: 'asc', ...params })}`),
  createRequest: (tableId, type) => request('/requests', { method: 'POST', body: { tableId, type } }),
  closeRequest: (id) => request(`/requests/${id}`, { method: 'PATCH', body: {} }),

  // ประวัติบิล
  getBills: () => request('/bills?_sort=createdAt&_order=desc'),
};
