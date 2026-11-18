# 🍲 Suki House — ระบบจัดการออร์เดอร์ร้านสุกี้

Final Project หัวข้อที่ 1 · React 18 + Vite + React Router · ไอคอน: Lucide · Backend: Node.js (Express + json-server)

## วิธีรัน

```bash
npm install          # ครั้งแรกครั้งเดียว
npm run dev          # รัน backend (:3001) + frontend (:5173) พร้อมกัน
```

เปิด <http://localhost:5173> · หยุดด้วย `Ctrl + C`

### บัญชีทดลอง

| ชื่อผู้ใช้ | รหัสผ่าน | บทบาท | ทำอะไรได้ |
|---|---|---|---|
| `manager` | `manager123` | ผู้จัดการ | ทุกอย่าง + เพิ่ม/แก้/ลบเมนู + เพิ่ม/ลบโต๊ะ |
| `staff` | `staff123` | พนักงาน | ดู/เปลี่ยนสถานะออร์เดอร์, ปิดบิล, เปิด/ปิดการขายเมนู (ของหมด) |

ลูกค้าไม่ต้องล็อกอิน แค่สแกน QR ของโต๊ะ

### คำสั่งทั้งหมด

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | โหมดพัฒนา (มี hot reload) |
| `npm test` | Unit + Component + API test (43 เคส) |
| `npm run test:e2e` | ทดสอบทั้ง flow ใน Chrome จริง (ต้องเปิด `npm run dev` ไว้ และ reset-db ก่อน) |
| `npm start` | โหมด production: build แล้วเสิร์ฟทั้งเว็บและ API ที่ <http://localhost:3001> พอร์ตเดียว |
| `npm run reset-db` | ล้างออร์เดอร์/บิลทั้งหมด (ต้องหยุดเซิร์ฟเวอร์ก่อน) |

**ทดสอบด้วยมือถือจริง:** ต่อ Wi-Fi วงเดียวกัน → ดู IP ในบรรทัด `Network:` ตอนรัน → เปิดหน้า “โต๊ะ & บิล” ผ่าน IP นั้น (เช่น `http://192.168.1.10:5173/staff/tables`) → กด QR → สแกนด้วยมือถือ

---

## การทำงานตามลำดับ (ตามโจทย์)

1. ลูกค้านั่งโต๊ะ A05 → สแกน QR → เปิด `/table/A05`
2. ระบบแสดงเมนูทั้งหมดแยกหมวด (เนื้อสัตว์ ทะเล ลูกชิ้น ผัก เส้น เครื่องดื่ม)
3. ลูกค้าเลือกอาหาร ปรับจำนวน เพิ่มลงตะกร้า (ตะกร้าจำไว้แม้รีเฟรชหน้า)
4. กด **สั่งอาหาร** → **ยืนยันการสั่งอาหาร**
5. เซิร์ฟเวอร์ตรวจโต๊ะ ตรวจเมนูว่ายังไม่หมด **คำนวณราคาเอง** แล้วบันทึกออร์เดอร์พร้อมเลขโต๊ะ วันเวลา รายการอาหาร
6. หน้า Dashboard พนักงานได้รับแจ้งผ่าน **Server-Sent Events** → ออร์เดอร์ใหม่ขึ้นทันที (ไม่ต้องรีเฟรช) พร้อมแจ้งเตือน
7. พนักงานเปลี่ยนสถานะ: รอรับออร์เดอร์ → กำลังเตรียมอาหาร → เสิร์ฟแล้ว
8. หน้าลูกค้าอัปเดตแถบสถานะเองทันที
9. ลูกค้ากด “เช็กบิล” → พนักงานกด “ปิดบิล” → ลูกค้าเห็น “ชำระเงินเรียบร้อย” และบิลเข้าประวัติ

**หลักการสำคัญ:** ออร์เดอร์ทั้งหมดอยู่ที่เซิร์ฟเวอร์ (`server/db.json`) ทุกหน้าจอเห็นข้อมูลชุดเดียวกัน เครื่องลูกค้าเก็บแค่ *ตะกร้าที่ยังไม่สั่ง* ใน localStorage

---

## ตรวจกับเกณฑ์การให้คะแนน

| # | เกณฑ์ (คะแนน) | สิ่งที่ทำ |
|---|---|---|
| 1 | ความครบถ้วนของฟังก์ชัน (25) | Core ครบ 10/10 + Optional ครบ 7/7 (ตารางด้านล่าง) |
| 2 | React และ State (15) | `useState` `useEffect` `useReducer` `useContext` `useMemo` `useCallback` `useRef` · custom hooks `useApi`, `useLiveStatus` · Context 2 ตัว (Cart, Auth) |
| 3 | API / CRUD (15) | REST API จริง: Create/Read/Update/Delete ทั้ง เมนู โต๊ะ ออร์เดอร์ คำขอ บิล · ตรวจข้อมูลและสิทธิ์ที่ฝั่งเซิร์ฟเวอร์ |
| 4 | UI/UX + Responsive (15) | Mobile-first: ตะกร้าเป็น bottom sheet, navbar ☰, ตารางกลายเป็นการ์ด, แถบสถานะออร์เดอร์, toast, loading/empty/error state ทุกหน้า · ทดสอบที่ 390px ไม่มี scroll แนวนอน |
| 5 | โครงสร้างโค้ด (10) | แยก `api / hooks / context / components / layouts / pages / utils` · logic อยู่ใน pure function ที่ทดสอบได้ · ใช้ validation ชุดเดียวกันทั้ง client และ server |
| 6 | Testing + Error (5) | **43 automated tests** (unit, component, API) + **E2E 22 ขั้นตอน** ใน Chrome จริง · จัดการ error ครบ (ด้านล่าง) |

### ข้อกำหนดทุกกลุ่ม

| ข้อกำหนด | ทำแล้ว |
|---|---|
| ≥ 3 หน้า | 9 หน้า: หน้าแรก, login, เมนูลูกค้า, ออร์เดอร์ลูกค้า, Dashboard, โต๊ะ & บิล, จัดการเมนู, ประวัติบิล, 404 |
| ≥ 5 Components | 17 components + 2 layouts |
| ค้นหา/กรอง | ค้นหาเมนู · กรองหมวดหมู่ · เฉพาะที่มีขาย · เรียงราคา · กรองสถานะออร์เดอร์ · ค้นหาโต๊ะ · กรองบิลตามวัน |
| จัดการข้อมูล ≥ 2 | ตะกร้า · สั่ง/ยกเลิกออร์เดอร์ · เปลี่ยนสถานะ · CRUD เมนู · เพิ่ม/ลบโต๊ะ · เรียกพนักงาน · ปิดบิล |
| Hooks | ดูเกณฑ์ข้อ 2 |
| Responsive | ดูเกณฑ์ข้อ 4 |
| API | Express + json-server |

### Core Requirements (10/10)

| # | ข้อกำหนด | ที่ไหน |
|---|---|---|
| 1 | แสดงรายการอาหารและหมวดหมู่ | `MenuPage`, `CategoryFilter`, `MenuCard` |
| 2 | ค้นหาและกรองอาหาร | `SearchBar`, `utils/menu.js → filterMenu` |
| 3 | เพิ่มและลบรายการในตะกร้า | `CartPanel`, `context/cartReducer.js` |
| 4 | ยืนยันออร์เดอร์พร้อมหมายเลขโต๊ะ | ยืนยัน 2 ขั้นใน `CartPanel` |
| 5 | ส่งออร์เดอร์ไประบบกลาง | `POST /api/orders` → `server/app.js` |
| 6 | Dashboard พนักงาน | `StaffDashboardPage` |
| 7 | เปลี่ยนสถานะออร์เดอร์ | `PATCH /api/orders/:id` (ตรวจลำดับสถานะที่ server) |
| 8 | จัดการเมนูอาหาร | `MenuManagementPage`, `MenuForm` |
| 9 | สถานะออร์เดอร์ของลูกค้า | `CustomerOrdersPage`, `OrderProgress` |
| 10 | Responsive | `index.css` (3 breakpoints) |

### Optional (7/7)

QR Code ประจำโต๊ะ · Real-time (SSE) · Dashboard สถิติ (รอ/กำลังทำ/ยอดสั่ง/เมนูขายดี) · ระบบจัดการโต๊ะ (สถานะโต๊ะ, ยอดค้าง) · เรียกพนักงาน · แจ้งเช็กบิล + ปิดบิล · ประวัติออร์เดอร์และประวัติบิล

---

## สถาปัตยกรรม

```
มือถือลูกค้า ─┐                         ┌─ REST  /api/*      (อ่าน/เขียนข้อมูล)
              ├─► React (Vite :5173) ───┤
คอมพนักงาน ──┘                         └─ SSE   /api/events (แจ้งว่า resource ไหนเปลี่ยน)
                                                  │
                               Node.js server (:3001) ── server/db.json
```

- **Real-time:** เมื่อมีการเขียนข้อมูล เซิร์ฟเวอร์ส่ง `{resource:"orders"}` ไปทุกเครื่องผ่าน SSE → hook `useApi` ที่สนใจ resource นั้นโหลดข้อมูลใหม่ (+ polling 15 วินาทีสำรองถ้าการเชื่อมต่อหลุด, มีไฟ 🟢 Live บอกสถานะ)
- **ความปลอดภัย:** รหัสผ่านเก็บแบบ hash (scrypt + salt) · token สุ่ม 256-bit หมดอายุ 12 ชม. · `/api/users` และ `/api/db` ถูกปิด · ทุกการเขียนตรวจสิทธิ์ที่ server (ซ่อนปุ่มฝั่ง client อย่างเดียวไม่พอ)
- **ไม่เชื่อข้อมูลจากลูกค้า:** ลูกค้าส่งแค่ `menuId + qty` เซิร์ฟเวอร์ดึงราคาจริงมาคำนวณเอง, ตัด field แปลกปลอมทิ้ง

## โครงสร้างโค้ด

```
server/
  app.js           API: auth, สิทธิ์, validation, SSE, ปิดบิล (ครอบ json-server)
  index.js         จุดเริ่มเซิร์ฟเวอร์
  db.json          ฐานข้อมูล (db.seed.json = ข้อมูลตั้งต้น)
src/
  api/client.js    รวมทุกการเรียก API + แนบ token + แปลง error
  api/live.js      การเชื่อมต่อ SSE เส้นเดียว แจกให้ทุก component
  hooks/           useApi (loading/error/refresh/live), useLiveStatus
  context/         CartContext (useReducer), AuthContext
  components/      Navbar, SearchBar, CategoryFilter, MenuCard, QtyStepper, CartPanel,
                   OrderCard, OrderProgress, StatusBadge, MenuForm, StatCard, LiveIndicator,
                   RequireAuth, Feedback (Loading / ErrorMessage / EmptyState / Toast)
                   icons.jsx (ไอคอนประจำหมวดหมู่ ใช้แทนรูปอาหาร)
  layouts/         StaffLayout, TableLayout
  pages/           9 หน้า
  utils/           pure functions: format, status, menu (filter/validate), stats
tests/             cartReducer, utils, components (jsdom), server (supertest)
e2e/flow.mjs       ทดสอบ end-to-end ใน Chrome
```

## การจัดการข้อผิดพลาด

| สถานการณ์ | ระบบทำอะไร |
|---|---|
| เซิร์ฟเวอร์ล่ม / เน็ตหลุด | ข้อความแจ้ง + ปุ่ม “ลองใหม่”, ไฟ Live เป็น Offline แล้วต่อใหม่เอง |
| เปิดโต๊ะที่ไม่มี `/table/Z99` | หน้า “ไม่พบโต๊ะ” |
| เมนูหมดระหว่างอยู่ในตะกร้า | server ตอบ 409 พร้อมชื่อเมนู, หน้าเมนูอัปเดตป้าย “หมด” |
| ลูกค้าแก้ราคาเอง (ยิง API ตรง) | ไม่มีผล server คิดราคาจากฐานข้อมูล |
| ยกเลิกออร์เดอร์ที่ครัวรับแล้ว | server ปฏิเสธ (409) |
| พนักงานกดข้ามขั้นสถานะ | server ปฏิเสธ (409) |
| ปิดบิลขณะยังมีออร์เดอร์ไม่เสิร์ฟ | server ปฏิเสธ + ปุ่มปิดบิลถูก disable |
| กดเรียกพนักงานซ้ำ | ไม่สร้างคำขอซ้ำ |
| token หมดอายุ | พากลับหน้า login อัตโนมัติ |
| ฟอร์มกรอกผิด | แสดง error ใต้ช่อง (ตรวจทั้ง client และ server) |
| ลบโต๊ะที่ยังมีออร์เดอร์ค้าง | server ปฏิเสธ |
