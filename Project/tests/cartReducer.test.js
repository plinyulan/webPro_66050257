import { describe, expect, it } from 'vitest';
import { cartReducer, cartCount, cartTotal, MAX_QTY } from '../src/context/cartReducer.js';

const pork = { id: 1, name: 'หมูสไลซ์', price: 79, categoryId: 'meat' };
const veg = { id: 11, name: 'ผักรวม', price: 49, categoryId: 'veg' };

describe('cartReducer', () => {
  it('เพิ่มสินค้าใหม่ลงตะกร้า', () => {
    const state = cartReducer([], { type: 'ADD', item: pork });
    expect(state).toEqual([{ menuId: 1, name: 'หมูสไลซ์', price: 79, categoryId: 'meat', qty: 1 }]);
  });

  it('เพิ่มสินค้าเดิมซ้ำ → เพิ่มจำนวน ไม่สร้างรายการใหม่', () => {
    let state = cartReducer([], { type: 'ADD', item: pork });
    state = cartReducer(state, { type: 'ADD', item: pork, qty: 2 });
    expect(state).toHaveLength(1);
    expect(state[0].qty).toBe(3);
  });

  it('จำกัดจำนวนสูงสุดต่อเมนู', () => {
    const state = cartReducer([], { type: 'ADD', item: pork, qty: 99 });
    expect(state[0].qty).toBe(MAX_QTY);
  });

  it('SET_QTY เป็น 0 → ลบรายการออก', () => {
    const state = cartReducer([{ menuId: 1, price: 79, qty: 2 }], { type: 'SET_QTY', menuId: 1, qty: 0 });
    expect(state).toEqual([]);
  });

  it('REMOVE และ CLEAR', () => {
    let state = cartReducer([], { type: 'ADD', item: pork });
    state = cartReducer(state, { type: 'ADD', item: veg });
    expect(cartReducer(state, { type: 'REMOVE', menuId: 1 }).map((i) => i.menuId)).toEqual([11]);
    expect(cartReducer(state, { type: 'CLEAR' })).toEqual([]);
  });

  it('action ที่ไม่รู้จัก → state เดิม', () => {
    const state = [{ menuId: 1, qty: 1, price: 10 }];
    expect(cartReducer(state, { type: 'UNKNOWN' })).toBe(state);
  });

  it('คำนวณยอดรวมและจำนวน', () => {
    const items = [{ price: 79, qty: 2 }, { price: 49, qty: 1 }];
    expect(cartTotal(items)).toBe(207);
    expect(cartCount(items)).toBe(3);
  });
});
