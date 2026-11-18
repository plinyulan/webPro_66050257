import { isSameDay } from './format.js';

// สรุปสถิติสำหรับ Dashboard พนักงาน
export function computeStats(orders, today = new Date()) {
  const todayOrders = orders.filter((o) => isSameDay(o.createdAt, today) && o.status !== 'cancelled');
  const count = (status) => orders.filter((o) => o.status === status).length;

  const itemTotals = {};
  todayOrders.forEach((o) =>
    o.items.forEach((it) => {
      itemTotals[it.name] = (itemTotals[it.name] || 0) + it.qty;
    }),
  );
  const topItems = Object.entries(itemTotals)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    todayCount: todayOrders.length,
    pending: count('pending'),
    preparing: count('preparing'),
    revenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
    topItems,
  };
}
