import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartReducer, cartCount, cartTotal } from './cartReducer.js';

const CartContext = createContext(null);

// ตะกร้าเก็บในเครื่องลูกค้า (แยกตามโต๊ะ) — ส่วนออร์เดอร์ที่ยืนยันแล้วจะถูกส่งไปเก็บที่ระบบกลาง
const storageKey = (tableId) => `suki-cart-${tableId}`;

function loadCart(tableId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(tableId))) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ tableId, children }) {
  const [items, dispatch] = useReducer(cartReducer, tableId, loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(tableId), JSON.stringify(items));
    } catch {
      /* storage อาจถูกปิด — ตะกร้ายังทำงานได้ในหน่วยความจำ */
    }
  }, [tableId, items]);

  const value = useMemo(
    () => ({ items, dispatch, total: cartTotal(items), count: cartCount(items) }),
    [items],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart ต้องใช้ภายใน <CartProvider>');
  return ctx;
}
