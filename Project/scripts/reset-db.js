// คืนค่าฐานข้อมูลกลับเป็นข้อมูลตั้งต้น: npm run reset-db
// ⚠️ ต้องหยุดเซิร์ฟเวอร์ก่อน (Ctrl+C) เพราะเซิร์ฟเวอร์ถือข้อมูลไว้ในหน่วยความจำและจะเขียนทับกลับ
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const seed = fileURLToPath(new URL('../server/db.seed.json', import.meta.url));
const db = fileURLToPath(new URL('../server/db.json', import.meta.url));

try {
  await fetch('http://localhost:3001/api/tables', { signal: AbortSignal.timeout(500) });
  console.error('⚠️  เซิร์ฟเวอร์ยังรันอยู่ — กด Ctrl+C หยุด npm run dev ก่อน แล้วค่อยรัน npm run reset-db');
  process.exit(1);
} catch {
  // เซิร์ฟเวอร์ไม่ได้รัน → รีเซ็ตได้
}
copyFileSync(seed, db);
console.log('✅ รีเซ็ตข้อมูลเรียบร้อย (ออร์เดอร์/บิล/คำขอ ถูกล้าง, เมนูและโต๊ะกลับเป็นค่าเริ่มต้น)');
