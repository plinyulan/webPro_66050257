import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.js';

// ทุกเทสต์ใช้ฐานข้อมูลสำเนาใหม่จาก db.seed.json
let app;
beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suki-'));
  const dbFile = path.join(dir, 'db.json');
  fs.copyFileSync(new URL('../server/db.seed.json', import.meta.url), dbFile);
  app = createApp({ dbFile, logger: false });
});

const login = async (username, password = `${username}123`) =>
  (await request(app).post('/api/auth/login').send({ username, password })).body.token;
const placeOrder = (body) => request(app).post('/api/orders').send({ tableId: 'A05', items: [{ menuId: 1, qty: 2 }], ...body });

describe('Auth', () => {
  it('รหัสผ่านผิด → 401, ถูก → ได้ token และไม่ส่ง hash กลับ', async () => {
    expect((await request(app).post('/api/auth/login').send({ username: 'staff', password: 'x' })).status).toBe(401);
    const res = await request(app).post('/api/auth/login').send({ username: 'staff', password: 'staff123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 2, username: 'staff', name: expect.any(String), role: 'staff' });
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.body.user.role).toBe('staff');
  });

  it('ห้ามอ่าน /users และ /db', async () => {
    expect((await request(app).get('/api/users')).status).toBe(403);
    expect((await request(app).get('/api/db')).status).toBe(403);
  });

  it('logout แล้ว token ใช้ไม่ได้', async () => {
    const token = await login('staff');
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });
});

describe('สั่งอาหาร', () => {
  it('เซิร์ฟเวอร์คำนวณราคาเอง ไม่เชื่อราคาจากลูกค้า', async () => {
    const res = await placeOrder({ items: [{ menuId: 1, qty: 2, price: 1 }, { menuId: 1, qty: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.items).toEqual([{ menuId: 1, name: 'หมูสไลซ์', price: 79, qty: 3 }]);
    expect(res.body.total).toBe(237);
    expect(res.body.status).toBe('pending');
  });

  it('ปฏิเสธเมนูที่หมด / โต๊ะที่ไม่มี / ตะกร้าว่าง / จำนวนผิด', async () => {
    expect((await placeOrder({ items: [{ menuId: 7, qty: 1 }] })).status).toBe(409); // หอยแมลงภู่หมด
    expect((await placeOrder({ tableId: 'Z99' })).status).toBe(400);
    expect((await placeOrder({ items: [] })).status).toBe(400);
    expect((await placeOrder({ items: [{ menuId: 1, qty: 0 }] })).status).toBe(400);
    expect((await placeOrder({ items: [{ menuId: 1, qty: 1.5 }] })).status).toBe(400);
  });
});

describe('สถานะออร์เดอร์', () => {
  it('ลูกค้ายกเลิกได้เฉพาะตอนรอรับออร์เดอร์', async () => {
    const { body: o1 } = await placeOrder();
    expect((await request(app).patch(`/api/orders/${o1.id}`).send({ status: 'cancelled' })).status).toBe(200);

    const { body: o2 } = await placeOrder();
    const token = await login('staff');
    await request(app).patch(`/api/orders/${o2.id}`).set('Authorization', `Bearer ${token}`).send({ status: 'preparing' });
    const res = await request(app).patch(`/api/orders/${o2.id}`).send({ status: 'cancelled' });
    expect(res.status).toBe(409);
  });

  it('ลูกค้าเปลี่ยนเป็น served เองไม่ได้', async () => {
    const { body } = await placeOrder();
    expect((await request(app).patch(`/api/orders/${body.id}`).send({ status: 'served' })).status).toBe(401);
  });

  it('พนักงานต้องเดินตามลำดับ ข้ามขั้นไม่ได้', async () => {
    const { body } = await placeOrder();
    const auth = { Authorization: `Bearer ${await login('staff')}` };
    expect((await request(app).patch(`/api/orders/${body.id}`).set(auth).send({ status: 'served' })).status).toBe(409);
    expect((await request(app).patch(`/api/orders/${body.id}`).set(auth).send({ status: 'preparing' })).body.status).toBe('preparing');
    expect((await request(app).patch(`/api/orders/${body.id}`).set(auth).send({ status: 'served' })).body.status).toBe('served');
  });

  it('ลบออร์เดอร์ผ่าน REST ไม่ได้', async () => {
    const { body } = await placeOrder();
    expect((await request(app).delete(`/api/orders/${body.id}`)).status).toBe(405);
  });
});

describe('เมนู', () => {
  it('ไม่ล็อกอิน → 401, พนักงานแก้ราคา → 403, ผู้จัดการ → สำเร็จ', async () => {
    expect((await request(app).patch('/api/menu/1').send({ price: 1 })).status).toBe(401);
    const staff = { Authorization: `Bearer ${await login('staff')}` };
    expect((await request(app).patch('/api/menu/1').set(staff).send({ price: 1 })).status).toBe(403);
    const manager = { Authorization: `Bearer ${await login('manager')}` };
    const res = await request(app).patch('/api/menu/1').set(manager).send({ price: 89 });
    expect(res.body.price).toBe(89);
  });

  it('พนักงานปิดการขาย (ของหมด) ได้', async () => {
    const staff = { Authorization: `Bearer ${await login('staff')}` };
    const res = await request(app).patch('/api/menu/1').set(staff).send({ available: false });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  it('ตรวจข้อมูลเมนูใหม่ และตัด field แปลกปลอมทิ้ง', async () => {
    const manager = { Authorization: `Bearer ${await login('manager')}` };
    expect((await request(app).post('/api/menu').set(manager).send({ name: '', price: -1 })).status).toBe(400);
    const res = await request(app).post('/api/menu').set(manager).send({ name: ' ปูอัด ', price: '35', categoryId: 'balls', hacked: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'ปูอัด', price: 35, available: true });
    expect(res.body.hacked).toBeUndefined();
  });
});

describe('เรียกพนักงาน / ปิดบิล', () => {
  it('ส่งคำขอซ้ำ → ไม่สร้างใหม่', async () => {
    const first = await request(app).post('/api/requests').send({ tableId: 'A05', type: 'call' });
    const again = await request(app).post('/api/requests').send({ tableId: 'A05', type: 'call' });
    expect(first.status).toBe(201);
    expect(again.body).toMatchObject({ id: first.body.id, duplicate: true });
  });

  it('ปิดบิลไม่ได้ถ้ายังมีออร์เดอร์ที่ยังไม่เสิร์ฟ, เสิร์ฟครบแล้วปิดบิลได้', async () => {
    const auth = { Authorization: `Bearer ${await login('staff')}` };
    const { body: order } = await placeOrder();
    expect((await request(app).post('/api/tables/A05/checkout').set(auth)).status).toBe(409);

    await request(app).patch(`/api/orders/${order.id}`).set(auth).send({ status: 'preparing' });
    await request(app).patch(`/api/orders/${order.id}`).set(auth).send({ status: 'served' });
    await request(app).post('/api/requests').send({ tableId: 'A05', type: 'bill' });

    const bill = await request(app).post('/api/tables/A05/checkout').set(auth);
    expect(bill.status).toBe(201);
    expect(bill.body).toMatchObject({ tableId: 'A05', total: 158, orderIds: [order.id], cashier: 'staff' });
    expect((await request(app).get(`/api/orders/${order.id}`)).body.paid).toBe(true);
    expect((await request(app).get('/api/requests?status=open')).body).toEqual([]);
    // ออร์เดอร์ที่จ่ายแล้วแก้ไม่ได้
    expect((await request(app).patch(`/api/orders/${order.id}`).set(auth).send({ status: 'cancelled' })).status).toBe(409);
  });
});

describe('ปิดบิล: ออร์เดอร์ที่ยกเลิก', () => {
  it('ถูกปิดไปพร้อมบิลแต่ไม่คิดเงิน', async () => {
    const auth = { Authorization: `Bearer ${await login('staff')}` };
    const { body: cancelled } = await placeOrder();
    await request(app).patch(`/api/orders/${cancelled.id}`).send({ status: 'cancelled' });
    const { body: served } = await placeOrder({ items: [{ menuId: 17, qty: 1 }] });
    await request(app).patch(`/api/orders/${served.id}`).set(auth).send({ status: 'preparing' });
    await request(app).patch(`/api/orders/${served.id}`).set(auth).send({ status: 'served' });

    const bill = await request(app).post('/api/tables/A05/checkout').set(auth);
    expect(bill.body.total).toBe(15);
    const { body: orders } = await request(app).get('/api/orders?tableId=A05');
    expect(orders.every((o) => o.billId === bill.body.id)).toBe(true);
    expect(orders.find((o) => o.id === cancelled.id).paid).toBe(false);
  });
});

describe('โต๊ะ', () => {
  it('ผู้จัดการเพิ่มโต๊ะได้ / รหัสซ้ำไม่ได้ / ลบโต๊ะที่มีออร์เดอร์ค้างไม่ได้', async () => {
    const manager = { Authorization: `Bearer ${await login('manager')}` };
    expect((await request(app).post('/api/tables').set(manager).send({ id: 'c01', seats: 2 })).body.id).toBe('C01');
    expect((await request(app).post('/api/tables').set(manager).send({ id: 'C01', seats: 2 })).status).toBe(409);
    await placeOrder();
    expect((await request(app).delete('/api/tables/A05').set(manager)).status).toBe(409);
    expect((await request(app).delete('/api/tables/C01').set(manager)).status).toBe(200);
  });
});

describe('Real-time events', () => {
  it('แจ้งชื่อ resource ที่เปลี่ยนผ่าน /api/events', async () => {
    const server = app.listen(0);
    const { port } = server.address();
    const ctrl = new AbortController();
    const res = await fetch(`http://localhost:${port}/api/events`, { signal: ctrl.signal });
    const reader = res.body.getReader();
    await reader.read(); // retry header
    await fetch(`http://localhost:${port}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: 'A05', items: [{ menuId: 1, qty: 1 }] }),
    });
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('"resource":"orders"');
    ctrl.abort();
    server.close();
  });
});
