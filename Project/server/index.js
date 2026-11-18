// จุดเริ่มเซิร์ฟเวอร์: node server/index.js
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const dbFile = fileURLToPath(new URL('./db.json', import.meta.url));
const seedFile = fileURLToPath(new URL('./db.seed.json', import.meta.url));
const staticDir = fileURLToPath(new URL('../dist', import.meta.url));
if (!fs.existsSync(dbFile)) fs.copyFileSync(seedFile, dbFile);

const PORT = Number(process.env.PORT) || 3001;
createApp({ dbFile, staticDir: process.argv.includes('--prod') || process.env.NODE_ENV === 'production' ? staticDir : undefined }).listen(PORT, () => {
  console.log(`🍲 Suki House API พร้อมใช้งานที่ http://localhost:${PORT}/api`);
  if (process.argv.includes('--prod')) console.log(`🌐 เปิดเว็บที่ http://localhost:${PORT}`);
});
