import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { computeStats } from '../utils/stats.js';
import { formatPrice, timeAgo } from '../utils/format.js';
import { ORDER_STATUS, isActive } from '../utils/status.js';
import OrderCard from '../components/OrderCard.jsx';
import StatCard from '../components/StatCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { EmptyState, ErrorMessage, Loading, Toast } from '../components/Feedback.jsx';
import { BellRing, CircleCheckBig, Clock, Flame, Hand, Receipt, ReceiptText, Wallet } from 'lucide-react';

const FILTERS = [
  { id: 'active', label: 'ต้องทำ' },
  { id: 'pending', label: ORDER_STATUS.pending.label },
  { id: 'preparing', label: ORDER_STATUS.preparing.label },
  { id: 'served', label: ORDER_STATUS.served.label },
  { id: 'cancelled', label: ORDER_STATUS.cancelled.label },
  { id: 'all', label: 'ประวัติทั้งหมด' },
];

export default function StaffDashboardPage() {
  // real-time ผ่าน Server-Sent Events + polling สำรองทุก 15 วินาที
  const ordersQ = useApi(() => api.getOrders(), { live: ['orders'], interval: 15000 });
  const requestsQ = useApi(() => api.getRequests({ status: 'open' }), { live: ['requests'], interval: 15000 });
  const [filter, setFilter] = useState('active');
  const [tableSearch, setTableSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [newIds, setNewIds] = useState(() => new Set());
  const seenIds = useRef(null);

  const orders = useMemo(() => ordersQ.data ?? [], [ordersQ.data]);

  // แจ้งเตือนเมื่อมีออร์เดอร์ใหม่เข้ามา (เทียบกับรอบ polling ก่อนหน้า)
  useEffect(() => {
    if (!ordersQ.data) return;
    const ids = ordersQ.data.map((o) => o.id);
    if (seenIds.current) {
      const fresh = ordersQ.data.filter((o) => !seenIds.current.has(o.id));
      if (fresh.length) {
        setToast({ type: 'success', text: `ออร์เดอร์ใหม่จากโต๊ะ ${[...new Set(fresh.map((o) => o.tableId))].join(', ')}` });
        setNewIds((prev) => new Set([...prev, ...fresh.map((o) => o.id)]));
      }
    }
    seenIds.current = new Set(ids);
  }, [ordersQ.data]);

  const stats = useMemo(() => computeStats(orders), [orders]);

  const visible = useMemo(() => {
    const keyword = tableSearch.trim().toUpperCase();
    return orders
      .filter((o) => (filter === 'all' ? true : filter === 'active' ? isActive(o.status) : o.status === filter))
      .filter((o) => !keyword || o.tableId.includes(keyword))
      // งานที่ต้องทำ: เก่าสุดขึ้นก่อน (มาก่อนได้ก่อน)
      .sort((a, b) => (filter === 'active' ? a.createdAt.localeCompare(b.createdAt) : 0));
  }, [orders, filter, tableSearch]);

  async function changeStatus(order, status) {
    setBusyId(order.id);
    try {
      await api.updateOrderStatus(order.id, status);
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      await ordersQ.refresh();
    } catch (err) {
      setToast({ type: 'error', text: `อัปเดตไม่สำเร็จ: ${err.message}` });
    } finally {
      setBusyId(null);
    }
  }

  async function cancelOrder(order) {
    if (window.confirm(`ยกเลิกออร์เดอร์ #${order.id} ของโต๊ะ ${order.tableId}?`)) await changeStatus(order, 'cancelled');
  }

  async function closeRequest(req) {
    try {
      await api.closeRequest(req.id);
      await requestsQ.refresh();
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  async function checkout(tableId) {
    const due = orders.filter((o) => o.tableId === tableId && !o.billId && o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    if (!window.confirm(`ปิดบิลโต๊ะ ${tableId} ยอด ${formatPrice(due)} ?`)) return;
    try {
      const bill = await api.checkout(tableId);
      setToast({ type: 'success', text: `ปิดบิลโต๊ะ ${tableId} แล้ว ยอด ${formatPrice(bill.total)}` });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ออร์เดอร์</h1>
          <p className="muted small">ออร์เดอร์ใหม่จะขึ้นทันทีโดยไม่ต้องรีเฟรช</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Clock} label="รอรับออร์เดอร์" value={stats.pending} tone="warn" />
        <StatCard icon={Flame} label="กำลังเตรียม" value={stats.preparing} tone="info" />
        <StatCard icon={ReceiptText} label="ออร์เดอร์วันนี้" value={stats.todayCount} />
        <StatCard icon={Wallet} label="ยอดสั่งวันนี้" value={formatPrice(stats.revenue)} tone="ok" />
      </div>

      <div className="dashboard-layout">
        <section>
          <div className="toolbar">
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <SearchBar value={tableSearch} onChange={setTableSearch} placeholder="ค้นหาโต๊ะ เช่น A05" />
          </div>

          {ordersQ.loading && <Loading />}
          {ordersQ.error && <ErrorMessage error={ordersQ.error} onRetry={ordersQ.refresh} />}
          {ordersQ.data && visible.length === 0 && <EmptyState icon={CircleCheckBig} title="ไม่มีออร์เดอร์ในหมวดนี้" />}
          <div className="order-grid">
            {visible.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                mode="staff"
                highlight={newIds.has(o.id)}
                busy={busyId === o.id}
                onChangeStatus={changeStatus}
                onCancel={cancelOrder}
              />
            ))}
          </div>
        </section>

        <aside className="side-col">
          <div className="card">
            <h2 className="card-title"><BellRing size={16} /> คำขอจากโต๊ะ</h2>
            {requestsQ.error && <ErrorMessage error={requestsQ.error} onRetry={requestsQ.refresh} />}
            {requestsQ.data?.length === 0 && <p className="muted small">ไม่มีคำขอ</p>}
            <ul className="request-list">
              {requestsQ.data?.map((r) => (
                <li key={r.id} className={`request-${r.type}`}>
                  <span className="request-icon">{r.type === 'bill' ? <Receipt size={16} /> : <Hand size={16} />}</span>
                  <div className="grow">
                    <strong>โต๊ะ {r.tableId}</strong>
                    <div className="muted small">{r.type === 'bill' ? 'ขอเช็กบิล' : 'เรียกพนักงาน'} · {timeAgo(r.createdAt)}</div>
                  </div>
                  {r.type === 'bill' ? (
                    <button className="btn btn-sm btn-primary" onClick={() => checkout(r.tableId)}>ปิดบิล</button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => closeRequest(r)}>รับทราบ</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="card-title">เมนูขายดีวันนี้</h2>
            {stats.topItems.length === 0 ? (
              <p className="muted small">ยังไม่มีข้อมูล</p>
            ) : (
              <ol className="top-list">
                {stats.topItems.map((it) => (
                  <li key={it.name}>
                    <span>{it.name}</span>
                    <span className="bar" style={{ '--w': `${(it.qty / stats.topItems[0].qty) * 100}%` }} />
                    <strong>{it.qty}</strong>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
