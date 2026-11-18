import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ClipboardList, HeartHandshake } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { formatDateTime, formatPrice } from '../utils/format.js';
import OrderCard from '../components/OrderCard.jsx';
import { EmptyState, ErrorMessage, Loading, Toast } from '../components/Feedback.jsx';

export default function CustomerOrdersPage() {
  const { tableId } = useParams();
  const location = useLocation();
  const newOrderId = location.state?.newOrderId;
  // real-time: เมื่อพนักงานเปลี่ยนสถานะ เซิร์ฟเวอร์แจ้งมา → โหลดใหม่ทันที (+ polling สำรองทุก 15 วิ)
  const { data: orders, error, loading, refresh } = useApi(() => api.getOrders({ tableId }), {
    live: ['orders'],
    interval: 15000,
    deps: [tableId],
  });
  const [toast, setToast] = useState(newOrderId ? { type: 'success', text: `ส่งออร์เดอร์ #${newOrderId} ไปที่ครัวแล้ว` } : null);
  const [busyId, setBusyId] = useState(null);

  // บิลปัจจุบัน = ออร์เดอร์ที่ยังไม่ปิดบิล, ที่ปิดแล้วเก็บเป็นประวัติ
  const { current, history, total } = useMemo(() => {
    const list = orders ?? [];
    // ออร์เดอร์ที่ยกเลิกเลื่อนไปท้ายรายการ
    const cur = list.filter((o) => !o.billId).sort((a, b) => (a.status === 'cancelled') - (b.status === 'cancelled'));
    return {
      current: cur,
      history: list.filter((o) => o.billId),
      total: cur.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  async function cancelOrder(order) {
    if (!window.confirm(`ยกเลิกออร์เดอร์ #${order.id} ?`)) return;
    setBusyId(order.id);
    try {
      // เซิร์ฟเวอร์อนุญาตให้ยกเลิกเฉพาะออร์เดอร์ที่ครัวยังไม่รับ
      await api.updateOrderStatus(order.id, 'cancelled');
      setToast({ type: 'info', text: `ยกเลิกออร์เดอร์ #${order.id} แล้ว` });
      refresh();
    } catch (err) {
      setToast({ type: 'error', text: err.message });
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ออร์เดอร์ของฉัน</h1>
          <p className="muted small">โต๊ะ {tableId} · สถานะอัปเดตอัตโนมัติ</p>
        </div>
        <div className="summary">
          <span className="muted small">ยอดที่ต้องชำระ</span>
          <strong>{formatPrice(total)}</strong>
        </div>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={refresh} />}

      {orders && current.length === 0 && (
        <EmptyState
          icon={history.length ? HeartHandshake : ClipboardList}
          title={history.length ? 'ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ' : 'ยังไม่มีออร์เดอร์'}
        >
          <Link className="btn btn-primary" to={`/table/${tableId}`}>{history.length ? 'สั่งเพิ่ม' : 'ไปเลือกเมนู'}</Link>
        </EmptyState>
      )}
      <div className="order-grid">
        {current.map((o) => (
          <OrderCard key={o.id} order={o} highlight={o.id === newOrderId} busy={busyId === o.id} onCancel={cancelOrder} />
        ))}
      </div>

      {history.length > 0 && (
        <details className="history card">
          <summary>ประวัติที่ชำระแล้ว ({history.length} ออร์เดอร์)</summary>
          <ul className="history-list">
            {history.map((o) => (
              <li key={o.id}>
                <span>#{o.id} · {formatDateTime(o.createdAt)} · {o.items.length} รายการ</span>
                <span>{o.status === 'cancelled' ? 'ยกเลิก' : formatPrice(o.total)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
