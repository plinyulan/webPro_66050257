export const MAX_QTY = 20;

// reducer ของตะกร้า: แยกออกจาก Context เพื่อให้ทดสอบได้
export function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { item, qty = 1 } = action;
      const existing = state.find((i) => i.menuId === item.id);
      if (existing) {
        return state.map((i) => (i.menuId === item.id ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i));
      }
      return [...state, { menuId: item.id, name: item.name, price: item.price, categoryId: item.categoryId, qty: Math.min(qty, MAX_QTY) }];
    }
    case 'SET_QTY':
      if (action.qty <= 0) return state.filter((i) => i.menuId !== action.menuId);
      return state.map((i) => (i.menuId === action.menuId ? { ...i, qty: Math.min(action.qty, MAX_QTY) } : i));
    case 'REMOVE':
      return state.filter((i) => i.menuId !== action.menuId);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export const cartTotal = (items) => items.reduce((sum, i) => sum + i.price * i.qty, 0);
export const cartCount = (items) => items.reduce((sum, i) => sum + i.qty, 0);
