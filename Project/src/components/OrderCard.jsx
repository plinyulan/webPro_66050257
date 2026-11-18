import { ArrowRight, MessageSquareText } from 'lucide-react';
import { formatPrice, formatTime, timeAgo } from '../utils/format.js';
import { ORDER_STATUS, nextStatus } from '../utils/status.js';
import StatusBadge from './StatusBadge.jsx';
import OrderProgress from './OrderProgress.jsx';

// การ์ดออร์เดอร์ ใช้ทั้งฝั่งลูกค้า (mode="customer") และพนักงาน (mode="staff")
export default function OrderCard({ order, mode = 'customer', highlight = false, busy = false, onChangeStatus, onCancel }) {
  const next = nextStatus(order.status);
  return (
    <article className={`order-card card status-${order.status} ${highlight ? 'highlight' : ''}`}>
      <header className="order-head">
        <div className="order-title">
          {mode === 'staff' && <span className="table-tag">โต๊ะ {order.tableId}</span>}
          <div>
            <strong>ออร์เดอร์ #{order.id}</strong>
            <div className="muted small">{formatTime(order.createdAt)} · {timeAgo(order.createdAt)}</div>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {mode === 'customer' && order.status !== 'cancelled' && <OrderProgress status={order.status} />}

      <ul className="order-items">
        {order.items.map((it) => (
          <li key={it.menuId}>
            <span><span className="qty">{it.qty}×</span> {it.name}</span>
            <span className="muted">{formatPrice(it.price * it.qty)}</span>
          </li>
        ))}
      </ul>
      {order.note && (
        <p className="note"><MessageSquareText size={14} aria-hidden /> {order.note}</p>
      )}

      <footer className="order-foot">
        <span>รวม <strong>{formatPrice(order.total)}</strong></span>
        <div className="row">
          {order.status === 'pending' && onCancel && (
            <button className="btn btn-sm btn-ghost danger" disabled={busy} onClick={() => onCancel(order)}>ยกเลิก</button>
          )}
          {mode === 'staff' && next && (
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => onChangeStatus(order, next)}>
              {ORDER_STATUS[next].label} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
