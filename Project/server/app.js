// Backend ของร้าน: ใช้ json-server เป็นฐานข้อมูล (server/db.json) และเพิ่ม
// - ระบบเข้าสู่ระบบ + สิทธิ์ตามบทบาท (manager / staff)
// - ตรวจสอบข้อมูลและคำนวณยอดเงินที่ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อราคาจากเครื่องลูกค้า)
// - Server-Sent Events (/api/events) แจ้งทุกหน้าจอทันทีเมื่อข้อมูลเปลี่ยน
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jsonServer from 'json-server';
import { TABLE_ID_PATTERN, validateMenuItem } from '../src/utils/menu.js';
import { canTransition } from '../src/utils/status.js';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง (1 กะ)
const MAX_QTY = 20;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createApp({ dbFile, staticDir, logger = true } = {}) {
  const app = jsonServer.create();
  const router = jsonServer.router(dbFile);
  const db = router.db; // lowdb instance
  const sessions = new Map(); // token -> { userId, expires }

  /* ---------------- Real-time: Server-Sent Events ---------------- */
  // ต้องประกาศก่อน middleware ของ json-server เพราะ gzip จะกัก stream ไว้
  const clients = new Set();
  app.get('/api/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
  });
  const broadcast = (resource) => {
    const msg = `data: ${JSON.stringify({ resource, at: Date.now() })}\n\n`;
    clients.forEach((c) => c.write(msg));
  };

  app.use(jsonServer.defaults({ logger, static: staticDir && fs.existsSync(staticDir) ? staticDir : path.join(process.cwd(), '.no-static') }));
  app.use(jsonServer.bodyParser);

  // ทุกครั้งที่เขียนข้อมูลสำเร็จ → แจ้ง client ทุกเครื่องว่า resource ไหนเปลี่ยน
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && !req.path.startsWith('/auth')) {
      // อ่านชื่อ resource ตอนนี้เลย (หลังจบ request Express จะคืน req.path เป็น /api/... ทั้งเส้น)
      const resource = req.path.split('/')[1];
      res.on('finish', () => {
        if (res.statusCode < 400) broadcast(resource);
      });
    }
    next();
  });

  /* ---------------- Helpers ---------------- */
  const now = () => new Date().toISOString();
  const nextId = (name) => db.get(name).map('id').max().value() + 1 || 1;
  const findTable = (id) => db.get('tables').find({ id: String(id).toUpperCase() }).value();
  const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role });

  const sendError = (res, err) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  };
  // handler ที่ตอบเองทั้งหมด: แปลง HttpError เป็น JSON { error }
  const handle = (fn) => (req, res) => {
    try {
      fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
  // middleware ตรวจข้อมูล: ผ่าน → ส่งต่อให้ json-server router บันทึก, ไม่ผ่าน → ตอบ error
  const validate = (fn) => (req, res, next) => {
    try {
      fn(req);
      next();
    } catch (err) {
      sendError(res, err);
    }
  };

  /* ---------------- Authentication ---------------- */
  app.use('/api', (req, res, next) => {
    const token = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const session = token && sessions.get(token);
    if (session && session.expires > Date.now()) {
      const user = db.get('users').find({ id: session.userId }).value();
      if (user) req.user = publicUser(user);
    } else if (session) {
      sessions.delete(token);
    }
    next();
  });

  const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ทำรายการนี้' });
    next();
  };

  app.post('/api/auth/login', handle((req, res) => {
    const { username = '', password = '' } = req.body || {};
    const user = db.get('users').find({ username: String(username).trim().toLowerCase() }).value();
    const hash = crypto.scryptSync(String(password), user?.salt || 'x', 64);
    const valid = user && crypto.timingSafeEqual(hash, Buffer.from(user.passwordHash, 'hex'));
    if (!valid) throw new HttpError(401, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_TTL_MS });
    res.json({ token, user: publicUser(user) });
  }));

  app.get('/api/auth/me', requireRole(), (req, res) => res.json({ user: req.user }));

  app.post('/api/auth/logout', (req, res) => {
    sessions.delete((req.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
    res.status(204).end();
  });

  // ห้ามเข้าถึงข้อมูลผู้ใช้ (รหัสผ่าน) และ dump ทั้งฐานข้อมูลผ่าน API ทั่วไป
  app.use(['/api/users', '/api/db'], (req, res) => res.status(403).json({ error: 'ไม่อนุญาต' }));

  /* ---------------- Orders ---------------- */
  // ลูกค้าส่งแค่ menuId + จำนวน → เซิร์ฟเวอร์ตรวจเมนูและคำนวณราคาเอง
  app.post('/api/orders', handle((req, res) => {
    const { tableId, items, note = '' } = req.body || {};
    const table = tableId && findTable(tableId);
    if (!table) throw new HttpError(400, 'ไม่พบหมายเลขโต๊ะ');
    if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'ตะกร้าว่าง');
    if (items.length > 50) throw new HttpError(400, 'รายการมากเกินไป');
    if (typeof note !== 'string' || note.length > 150) throw new HttpError(400, 'หมายเหตุยาวเกิน 150 ตัวอักษร');

    const merged = new Map();
    for (const it of items) {
      const qty = Number(it?.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new HttpError(400, `จำนวนต้องเป็น 1–${MAX_QTY}`);
      merged.set(Number(it.menuId), Math.min((merged.get(Number(it.menuId)) || 0) + qty, MAX_QTY));
    }
    const orderItems = [];
    const soldOut = [];
    for (const [menuId, qty] of merged) {
      const m = db.get('menu').find({ id: menuId }).value();
      if (!m || !m.available) soldOut.push(m?.name || `#${menuId}`);
      else orderItems.push({ menuId: m.id, name: m.name, price: m.price, qty });
    }
    if (soldOut.length) throw new HttpError(409, `ขออภัย เมนูนี้หมดแล้ว: ${soldOut.join(', ')} — กรุณาลบออกจากตะกร้า`);

    const order = {
      id: nextId('orders'),
      tableId: table.id,
      items: orderItems,
      total: orderItems.reduce((s, i) => s + i.price * i.qty, 0),
      note: note.trim(),
      status: 'pending',
      paid: false,
      createdAt: now(),
      updatedAt: now(),
    };
    db.get('orders').push(order).write();
    res.status(201).json(order);
  }));

  // เปลี่ยนสถานะ: พนักงานเดินตามขั้นตอน, ลูกค้ายกเลิกได้เฉพาะออร์เดอร์ที่ครัวยังไม่รับ
  app.patch('/api/orders/:id', handle((req, res) => {
    const ref = db.get('orders').find({ id: Number(req.params.id) });
    const order = ref.value();
    if (!order) throw new HttpError(404, 'ไม่พบออร์เดอร์');
    const { status } = req.body || {};
    if (order.billId) throw new HttpError(409, 'ออร์เดอร์นี้ปิดบิลแล้ว แก้ไขไม่ได้');
    if (!req.user) {
      if (status !== 'cancelled') throw new HttpError(401, 'กรุณาเข้าสู่ระบบ');
      if (order.status !== 'pending') throw new HttpError(409, 'ครัวรับออร์เดอร์นี้แล้ว ไม่สามารถยกเลิกได้');
    } else if (!canTransition(order.status, status)) {
      throw new HttpError(409, `เปลี่ยนสถานะจาก ${order.status} เป็น ${status} ไม่ได้`);
    }
    res.json(ref.assign({ status, updatedAt: now(), ...(req.user && { updatedBy: req.user.username }) }).write());
  }));

  /* ---------------- Requests (เรียกพนักงาน / เช็กบิล) ---------------- */
  app.post('/api/requests', handle((req, res) => {
    const { tableId, type } = req.body || {};
    const table = tableId && findTable(tableId);
    if (!table) throw new HttpError(400, 'ไม่พบหมายเลขโต๊ะ');
    if (!['call', 'bill'].includes(type)) throw new HttpError(400, 'ประเภทคำขอไม่ถูกต้อง');
    const existing = db.get('requests').find({ tableId: table.id, type, status: 'open' }).value();
    if (existing) return res.json({ ...existing, duplicate: true });
    const request = { id: nextId('requests'), tableId: table.id, type, status: 'open', createdAt: now() };
    db.get('requests').push(request).write();
    res.status(201).json(request);
  }));

  app.patch('/api/requests/:id', requireRole('staff', 'manager'), handle((req, res) => {
    const ref = db.get('requests').find({ id: Number(req.params.id) });
    if (!ref.value()) throw new HttpError(404, 'ไม่พบคำขอ');
    res.json(ref.assign({ status: 'done', doneAt: now(), doneBy: req.user.username }).write());
  }));

  /* ---------------- Checkout (ปิดบิลโต๊ะ) ---------------- */
  app.post('/api/tables/:id/checkout', requireRole('staff', 'manager'), handle((req, res) => {
    const table = findTable(req.params.id);
    if (!table) throw new HttpError(404, 'ไม่พบโต๊ะ');
    // ออร์เดอร์ทั้งหมดของรอบนี้ (ยังไม่ปิดบิล) — ที่ยกเลิกไปแล้วถูกปิดด้วยแต่ไม่คิดเงิน
    const session = db.get('orders').filter((o) => o.tableId === table.id && !o.billId).value();
    const unpaid = session.filter((o) => o.status !== 'cancelled');
    if (unpaid.some((o) => o.status !== 'served')) throw new HttpError(409, 'ยังมีออร์เดอร์ที่ยังไม่เสิร์ฟ กรุณาเสิร์ฟหรือยกเลิกก่อนปิดบิล');
    if (unpaid.length === 0) throw new HttpError(400, 'โต๊ะนี้ไม่มียอดค้างชำระ');

    const paidAt = now();
    const billId = nextId('bills');
    session.forEach((o) => Object.assign(o, { billId, paid: o.status !== 'cancelled', ...(o.status !== 'cancelled' && { paidAt }) }));
    db.get('requests').filter({ tableId: table.id, status: 'open' }).each((r) => Object.assign(r, { status: 'done', doneAt: paidAt })).value();
    const bill = {
      id: billId,
      tableId: table.id,
      orderIds: unpaid.map((o) => o.id),
      total: unpaid.reduce((s, o) => s + o.total, 0),
      createdAt: paidAt,
      cashier: req.user.username,
    };
    db.get('bills').push(bill).write();
    broadcast('orders');
    broadcast('requests');
    res.status(201).json(bill);
  }));

  /* ---------------- Menu / Tables / Categories ---------------- */
  // แก้ไขได้เฉพาะผู้จัดการ ยกเว้น "เปิด/ปิดการขาย" ที่พนักงานทำได้ (ของหมดระหว่างวัน)
  const onlyAvailability = (req) => req.method === 'PATCH' && Object.keys(req.body || {}).every((k) => k === 'available');
  app.use(['/api/menu', '/api/tables', '/api/categories'], (req, res, next) => {
    if (req.method === 'GET') return next();
    const roles = req.baseUrl === '/api/menu' && onlyAvailability(req) ? ['staff', 'manager'] : ['manager'];
    requireRole(...roles)(req, res, next);
  });

  app.post('/api/menu', validate((req) => validateMenuBody(req.body)));
  app.patch('/api/menu/:id', validate((req) => validateMenuBody(req.body, Number(req.params.id))));
  app.put('/api/menu/:id', (req, res) => res.status(405).json({ error: 'ใช้ PATCH แทน' }));

  app.post('/api/tables', validate((req) => {
    const id = String(req.body?.id || '').trim().toUpperCase();
    const seats = Number(req.body?.seats);
    if (!TABLE_ID_PATTERN.test(id)) throw new HttpError(400, 'รหัสโต๊ะต้องเป็นตัวอักษร 1 ตัว + เลข 2 หลัก เช่น A06');
    if (findTable(id)) throw new HttpError(409, `มีโต๊ะ ${id} อยู่แล้ว`);
    if (!Number.isInteger(seats) || seats < 1 || seats > 20) throw new HttpError(400, 'จำนวนที่นั่งต้องอยู่ระหว่าง 1–20');
    req.body = { id, seats };
  }));

  app.delete('/api/tables/:id', validate((req) => {
    const busy = db.get('orders').some((o) => o.tableId === req.params.id && !o.billId && o.status !== 'cancelled').value();
    if (busy) throw new HttpError(409, `โต๊ะ ${req.params.id} ยังมีออร์เดอร์ที่ยังไม่ชำระ ลบไม่ได้`);
  }));

  // ออร์เดอร์/คำขอ/บิล ห้ามแก้ผ่าน REST ทั่วไป (ต้องผ่าน endpoint ด้านบนเท่านั้น)
  app.use(['/api/orders', '/api/requests', '/api/bills'], (req, res, next) =>
    req.method === 'GET' ? next() : res.status(405).json({ error: 'ไม่อนุญาต' }),
  );

  // อ่านบิลได้เฉพาะพนักงาน
  app.use('/api/bills', requireRole('staff', 'manager'));

  app.use('/api', router);

  // Production: เสิร์ฟไฟล์ React ที่ build แล้ว (SPA fallback)
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  return app;

  // ตรวจและกรอง field ของเมนู (id = undefined คือสร้างใหม่)
  function validateMenuBody(body, id) {
    const isCreate = id === undefined;
    const current = isCreate ? {} : db.get('menu').find({ id }).value();
    if (!current) throw new HttpError(404, 'ไม่พบเมนู');
    const allowed = ['name', 'price', 'categoryId', 'description', 'available'];
    const clean = Object.fromEntries(Object.entries(body || {}).filter(([k]) => allowed.includes(k)));
    const merged = { ...current, ...clean };
    if (isCreate || 'name' in clean || 'price' in clean || 'categoryId' in clean) {
      const errors = validateMenuItem({ name: merged.name, price: merged.price ?? '', categoryId: merged.categoryId });
      if (Object.keys(errors).length) throw new HttpError(400, Object.values(errors).join(', '));
      if (!db.get('categories').find({ id: merged.categoryId }).value()) throw new HttpError(400, 'ไม่พบหมวดหมู่');
    }
    if ('name' in clean) clean.name = String(clean.name).trim();
    if ('price' in clean) clean.price = Number(clean.price);
    if ('available' in clean) clean.available = Boolean(clean.available);
    if (isCreate) Object.assign(clean, { description: clean.description || '', available: clean.available ?? true });
    Object.keys(body).forEach((k) => delete body[k]);
    Object.assign(body, clean);
  }
}
