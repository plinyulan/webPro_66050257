import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { formatDateTime, formatPrice, isSameDay } from '../utils/format.js';
import SearchBar from '../components/SearchBar.jsx';
import StatCard from '../components/StatCard.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';
import { ChevronDown, ReceiptText, Wallet } from 'lucide-react';

export default function BillsPage() {
  const billsQ = useApi(api.getBills, { live: ['tables', 'bills'] });
  const ordersQ = useApi(() => api.getOrders(), { live: ['orders'] });
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('today');
  const [openId, setOpenId] = useState(null);

  const ordersById = useMemo(() => new Map((ordersQ.data ?? []).map((o) => [o.id, o])), [ordersQ.data]);
  const bills = useMemo(() => {
    const keyword = search.trim().toUpperCase();
    return (billsQ.data ?? []).filter(
      (b) => (range === 'all' || isSameDay(b.createdAt)) && (!keyword || b.tableId.includes(keyword)),
    );
  }, [billsQ.data, search, range]);
  const total = bills.reduce((s, b) => s + b.total, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ประวัติบิล</h1>
          <p className="muted small">บิลที่ปิดแล้วทั้งหมด</p>
        </div>
      </div>
      <div className="stats-grid two">
        <StatCard icon={ReceiptText} label={range === 'today' ? 'บิลวันนี้' : 'บิลทั้งหมด'} value={bills.length} />
        <StatCard icon={Wallet} label="รายรับ (ชำระแล้ว)" value={formatPrice(total)} tone="ok" />
      </div>
      <div className="toolbar">
        <div className="chips">
          {[['today', 'วันนี้'], ['all', 'ทั้งหมด']].map(([id, label]) => (
            <button key={id} className={`chip ${range === id ? 'active' : ''}`} onClick={() => setRange(id)}>{label}</button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาโต๊ะ เช่น A05" />
      </div>

      {billsQ.loading && <Loading />}
      {billsQ.error && <ErrorMessage error={billsQ.error} onRetry={billsQ.refresh} />}
      {billsQ.data && bills.length === 0 && <EmptyState icon={ReceiptText} title="ยังไม่มีบิลในช่วงนี้" />}

      <div className="bill-list">
        {bills.map((b) => (
          <article key={b.id} className="card bill-card">
            <button className="bill-head" onClick={() => setOpenId(openId === b.id ? null : b.id)} aria-expanded={openId === b.id}>
              <span><b>บิล #{b.id}</b> · โต๊ะ {b.tableId}</span>
              <span className="muted small">{formatDateTime(b.createdAt)} · {b.cashier}</span>
              <strong>{formatPrice(b.total)}</strong>
              <ChevronDown size={16} className={`chev ${openId === b.id ? 'up' : ''}`} aria-hidden />
            </button>
            {openId === b.id && (
              <ul className="order-items bill-items">
                {b.orderIds.flatMap((id) => ordersById.get(id)?.items.map((it) => (
                  <li key={`${id}-${it.menuId}`}>
                    <span><span className="qty">{it.qty}×</span> {it.name} <span className="muted small">#{id}</span></span>
                    <span>{formatPrice(it.price * it.qty)}</span>
                  </li>
                )) ?? [])}
              </ul>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
