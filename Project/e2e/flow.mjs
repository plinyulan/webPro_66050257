// End-to-end test: จำลองลูกค้า (มือถือ) + พนักงาน (คอม) ใช้งานพร้อมกันใน Google Chrome จริง
// วิธีใช้: เปิด npm run dev ไว้ (ข้อมูลเริ่มต้นสะอาด: npm run reset-db ก่อน) แล้วรัน npm run test:e2e
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
const SHOTS = new URL('./screenshots', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const errors = [];
const browser = await chromium.launch({ channel: 'chrome' }); // ใช้ Chrome ที่ติดตั้งในเครื่อง
const watch = (page, name) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
};
const step = (s) => console.log('✔', s);

// ---- ลูกค้า (มือถือ) ----
const cust = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
watch(cust, 'customer');
await cust.goto(`${BASE}/table/A05`);
await cust.getByText('หมูสไลซ์').waitFor();
await cust.screenshot({ path: `${SHOTS}/1-customer-menu-mobile.png` });
step('customer menu loaded');

await cust.getByPlaceholder('ค้นหาเมนู เช่น หมู, กุ้ง').fill('กุ้ง');
const count = await cust.locator('.menu-card').count();
step(`search "กุ้ง" → ${count} cards`);
await cust.getByPlaceholder('ค้นหาเมนู เช่น หมู, กุ้ง').fill('');
await cust.getByRole('tab', { name: /เนื้อสัตว์/ }).click();
step(`category meat → ${await cust.locator('.menu-card').count()} cards`);
await cust.getByRole('tab', { name: /ทั้งหมด/ }).click();

const addBtn = (name) => cust.locator('.menu-card', { hasText: name }).getByRole('button', { name: /เพิ่ม/ });
await addBtn('หมูสไลซ์').click();
await addBtn('หมูสไลซ์').click();
await addBtn('ผักรวม').click();
await cust.locator('.cart-fab').click();
await cust.getByText('รวม 3 รายการ').waitFor();
await cust.getByPlaceholder(/ไม่ใส่ผักชี/).fill('ขอน้ำซุปเพิ่ม');
await cust.waitForTimeout(400); await cust.screenshot({ path: `${SHOTS}/2-cart-sheet-mobile.png` });
await cust.getByRole('button', { name: 'สั่งอาหาร', exact: true }).click();
await cust.getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }).click();
await cust.waitForURL(/\/orders$/);
await cust.getByText('ออร์เดอร์ #1').waitFor();
step('order placed, redirected to orders page');

// ---- พนักงาน (เดสก์ท็อป) ----
const staff = await (await browser.newContext({ viewport: { width: 1366, height: 860 } })).newPage();
watch(staff, 'staff');
await staff.goto(BASE);
await staff.locator('.table-tile').first().waitFor();
await staff.screenshot({ path: `${SHOTS}/0-home.png` });
await staff.goto(`${BASE}/table/A05`);
await staff.locator('.menu-card').first().waitFor();
await staff.screenshot({ path: `${SHOTS}/0-menu-desktop.png` });
await staff.goto(`${BASE}/staff`);
await staff.waitForURL(/\/login/);
await staff.screenshot({ path: `${SHOTS}/0-login.png` });
step('unauthenticated /staff → /login');
await staff.getByLabel('ชื่อผู้ใช้').fill('staff');
await staff.getByLabel('รหัสผ่าน').fill('wrong');
await staff.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
await staff.getByText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง').waitFor();
step('wrong password rejected');
await staff.getByLabel('รหัสผ่าน').fill('staff123');
await staff.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
await staff.waitForURL(/\/staff$/);
await staff.locator('.order-card', { hasText: 'ออร์เดอร์ #1' }).waitFor();
await staff.locator('.live.on').waitFor({ timeout: 5000 });
step('staff sees order #1, live connected');

// ออร์เดอร์ใหม่ต้องขึ้นที่ dashboard ทันที โดยไม่รีโหลด
await cust.goto(`${BASE}/table/A05`);
await addBtn('โค้ก').click();
await cust.locator('.cart-fab').click();
await cust.getByRole('button', { name: 'สั่งอาหาร', exact: true }).click();
await cust.getByRole('button', { name: 'ยืนยันการสั่งอาหาร' }).click();
await cust.waitForURL(/\/orders$/);
let t0 = Date.now();
await staff.locator('.order-card', { hasText: 'ออร์เดอร์ #2' }).waitFor({ timeout: 4000 });
step(`new order #2 appeared on dashboard in ${Date.now() - t0} ms (no reload)`);
await staff.locator('.toast').waitFor();
await staff.screenshot({ path: `${SHOTS}/3-staff-dashboard.png` });

// เปลี่ยนสถานะ → ฝั่งลูกค้าต้องอัปเดตเอง
const card1 = staff.locator('.order-card', { hasText: 'ออร์เดอร์ #1' });
await card1.getByRole('button', { name: /กำลังเตรียมอาหาร/ }).click();
t0 = Date.now();
await cust.locator('.order-card', { hasText: 'ออร์เดอร์ #1' }).locator('.badge', { hasText: 'กำลังเตรียมอาหาร' }).waitFor({ timeout: 4000 });
step(`customer saw "preparing" in ${Date.now() - t0} ms`);

// ลูกค้ายกเลิกออร์เดอร์ #1 ไม่ได้แล้ว (ไม่มีปุ่ม), ยกเลิก #2 ได้
cust.on('dialog', (d) => d.accept());
expect(await cust.locator('.order-card', { hasText: 'ออร์เดอร์ #1' }).getByRole('button', { name: 'ยกเลิก' }).count(), 0, 'no cancel on preparing');
await cust.locator('.order-card', { hasText: 'ออร์เดอร์ #2' }).getByRole('button', { name: 'ยกเลิก' }).click();
await cust.locator('.order-card', { hasText: 'ออร์เดอร์ #2' }).locator('.badge', { hasText: 'ยกเลิก' }).waitFor();
step('customer cancelled pending order #2');

await card1.getByRole('button', { name: /เสิร์ฟแล้ว/ }).click();
await cust.locator('.order-card', { hasText: 'ออร์เดอร์ #1' }).locator('.badge', { hasText: 'เสิร์ฟแล้ว' }).waitFor({ timeout: 4000 });
await cust.screenshot({ path: `${SHOTS}/4-customer-status-mobile.png`, fullPage: true });
step('served → customer progress updated');

// ลูกค้าขอเช็กบิล → พนักงานปิดบิล
await cust.getByRole('button', { name: /เช็กบิล/ }).click();
await cust.locator('.toast').waitFor();
staff.on('dialog', (d) => d.accept());
const req = staff.locator('.request-list li', { hasText: 'A05' });
await req.waitFor({ timeout: 4000 });
step('bill request appeared on dashboard');
await req.getByRole('button', { name: 'ปิดบิล' }).click();
await staff.getByText(/ปิดบิลโต๊ะ A05 แล้ว ยอด ฿207/).waitFor();
await cust.getByText('ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ').waitFor({ timeout: 4000 });
step('checkout ฿207 → customer sees thank-you');

// พนักงานทั่วไป: จัดการเมนูได้แค่เปิด/ปิดการขาย
await staff.goto(`${BASE}/staff/menu`);
await staff.getByText(/เปิด\/ปิดการขายได้/).waitFor();
expect(await staff.getByRole('button', { name: 'เมนูใหม่' }).count(), 0, 'staff cannot add menu');
await staff.locator('tr', { hasText: 'ชาเย็น' }).getByRole('switch').click();
await staff.locator('tr', { hasText: 'ชาเย็น' }).getByRole('switch', { name: 'หมด' }).waitFor();
step('staff marked ชาเย็น sold out');
await cust.goto(`${BASE}/table/A05`);
await cust.locator('.menu-card.sold-out', { hasText: 'ชาเย็น' }).waitFor();
step('customer sees ชาเย็น sold out');

// ผู้จัดการ: เพิ่มเมนู + โต๊ะ
await staff.getByRole('button', { name: 'ออกจากระบบ' }).click({ timeout: 5000 });
await staff.waitForURL(/\/login/);
await staff.getByLabel('ชื่อผู้ใช้').fill('manager');
await staff.getByLabel('รหัสผ่าน').fill('manager123');
await staff.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
await staff.waitForURL(/\/staff$/);
await staff.locator('.user-chip', { hasText: 'ผู้จัดการ' }).waitFor();
step('logged in as manager');
await staff.goto(`${BASE}/staff/menu`);
await staff.getByRole('button', { name: 'เมนูใหม่' }).click();
await staff.getByRole('button', { name: 'เพิ่มเมนู', exact: true }).click();
await staff.getByText('กรุณากรอกชื่อเมนู').waitFor();
step('menu form validation shown');
await staff.locator('.menu-form label', { hasText: 'ชื่อเมนู' }).locator('input').fill('ปูอัด');
await staff.locator('.menu-form label', { hasText: 'ราคา' }).locator('input').fill('35');
await staff.locator('.menu-form select').selectOption('balls');
await staff.getByRole('button', { name: 'เพิ่มเมนู', exact: true }).click();
await staff.locator('tr', { hasText: 'ปูอัด' }).waitFor();
step('manager added ปูอัด');
await staff.screenshot({ path: `${SHOTS}/5-menu-management.png`, fullPage: true });

await staff.goto(`${BASE}/staff/tables`);
await staff.getByPlaceholder('A06').fill('c01');
await staff.getByRole('button', { name: 'เพิ่มโต๊ะ' }).click();
await staff.getByText('โต๊ะ C01', { exact: true }).waitFor();
await staff.locator('.qr-card', { hasText: 'โต๊ะ A01' }).getByRole('button', { name: 'QR' }).click();
await staff.locator('.qr-card svg').first().waitFor();
await staff.screenshot({ path: `${SHOTS}/6-tables.png`, fullPage: true });
step('table C01 added, QR shown');

await staff.goto(`${BASE}/staff/bills`);
await staff.locator('.bill-card').first().click();
await staff.getByText('หมูสไลซ์').waitFor();
await staff.screenshot({ path: `${SHOTS}/7-bills.png` });
step('bill history shows items');

// มือถือ: dashboard + navbar
const mstaff = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, storageState: await staff.context().storageState() })).newPage();
watch(mstaff, 'm-staff');
await mstaff.goto(`${BASE}/staff`);
await mstaff.locator('.stat-card').first().waitFor();
await mstaff.screenshot({ path: `${SHOTS}/8-dashboard-mobile.png`, fullPage: true });
await mstaff.goto(`${BASE}/staff/menu`);
await mstaff.locator('tr', { hasText: 'หมูสไลซ์' }).waitFor();
await mstaff.screenshot({ path: `${SHOTS}/9-menu-mobile.png` });
const overflow = await mstaff.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
step(`mobile horizontal overflow: ${overflow}px`);

// 404 table
await cust.goto(`${BASE}/table/Z99`);
await cust.getByText(/ไม่พบโต๊ะ/).waitFor();
step('unknown table → not found page');

function expect(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}
await browser.close();
// 401 = ทดสอบรหัสผ่านผิด, 404 = ทดสอบเปิดโต๊ะที่ไม่มี → เป็น error ที่ตั้งใจ
const unexpected = errors.filter((e) => !/status of (401|404)/.test(e));
if (unexpected.length) {
  console.log('\n❌ Unexpected console errors:\n' + unexpected.join('\n'));
  process.exitCode = 1;
} else {
  console.log('\n✅ ผ่านทุกขั้นตอน ไม่มี error ที่ไม่คาดคิด (ภาพหน้าจออยู่ที่ e2e/screenshots/)');
}
