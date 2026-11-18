import { describe, expect, it } from 'vitest';
import { filterMenu, validateMenuItem, TABLE_ID_PATTERN } from '../src/utils/menu.js';
import { nextStatus, isActive } from '../src/utils/status.js';
import { computeStats } from '../src/utils/stats.js';
import { timeAgo } from '../src/utils/format.js';

const menu = [
  { id: 1, name: 'หมูสไลซ์', categoryId: 'meat', price: 79, description: 'หมูนุ่ม', available: true },
  { id: 2, name: 'เนื้อวัว', categoryId: 'meat', price: 129, description: '', available: false },
  { id: 3, name: 'ผักรวม', categoryId: 'veg', price: 49, description: 'ผักสด', available: true },
];

describe('filterMenu', () => {
  it('ค้นหาตามชื่อหรือคำอธิบาย', () => {
    expect(filterMenu(menu, { search: 'หมู' }).map((m) => m.id)).toEqual([1]);
    expect(filterMenu(menu, { search: 'สด' }).map((m) => m.id)).toEqual([3]);
  });
  it('กรองตามหมวดหมู่และเฉพาะที่มีขาย', () => {
    expect(filterMenu(menu, { category: 'meat' })).toHaveLength(2);
    expect(filterMenu(menu, { category: 'meat', onlyAvailable: true })).toHaveLength(1);
  });
  it('เรียงราคา และไม่แก้ array ต้นฉบับ', () => {
    expect(filterMenu(menu, { sort: 'price-desc' }).map((m) => m.price)).toEqual([129, 79, 49]);
    expect(menu.map((m) => m.id)).toEqual([1, 2, 3]);
  });
});

describe('validateMenuItem', () => {
  it('ข้อมูลถูกต้อง → ไม่มี error', () => {
    expect(validateMenuItem({ name: 'กุ้ง', price: '99', categoryId: 'seafood' })).toEqual({});
  });
  it('ข้อมูลผิด → แจ้ง error ทุกช่อง', () => {
    const errs = validateMenuItem({ name: ' ', price: '-5', categoryId: '' });
    expect(Object.keys(errs).sort()).toEqual(['categoryId', 'name', 'price']);
  });
  it('รหัสโต๊ะ', () => {
    expect(TABLE_ID_PATTERN.test('A05')).toBe(true);
    expect(TABLE_ID_PATTERN.test('a5')).toBe(false);
  });
});

describe('status', () => {
  it('ลำดับสถานะออร์เดอร์', () => {
    expect(nextStatus('pending')).toBe('preparing');
    expect(nextStatus('preparing')).toBe('served');
    expect(nextStatus('served')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
    expect(isActive('preparing')).toBe(true);
    expect(isActive('served')).toBe(false);
  });
});

describe('computeStats', () => {
  it('ไม่นับออร์เดอร์ที่ยกเลิกในยอดขาย', () => {
    const now = new Date('2026-11-18T12:00:00');
    const orders = [
      { status: 'served', total: 100, createdAt: '2026-11-18T10:00:00', items: [{ name: 'หมู', qty: 2 }] },
      { status: 'pending', total: 50, createdAt: '2026-11-18T11:00:00', items: [{ name: 'ผัก', qty: 1 }] },
      { status: 'cancelled', total: 999, createdAt: '2026-11-18T11:00:00', items: [{ name: 'กุ้ง', qty: 9 }] },
    ];
    const s = computeStats(orders, now);
    expect(s.revenue).toBe(150);
    expect(s.todayCount).toBe(2);
    expect(s.pending).toBe(1);
    expect(s.topItems[0]).toEqual({ name: 'หมู', qty: 2 });
  });
});

describe('timeAgo', () => {
  it('แสดงเวลาแบบสัมพัทธ์', () => {
    const now = new Date('2026-11-18T12:00:00').getTime();
    expect(timeAgo('2026-11-18T11:59:40', now)).toBe('เมื่อสักครู่');
    expect(timeAgo('2026-11-18T11:45:00', now)).toBe('15 นาทีที่แล้ว');
  });
});
