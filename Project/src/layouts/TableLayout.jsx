import { useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { Armchair, BellRing, BookOpen, ClipboardList, Receipt } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { CartProvider } from '../context/CartContext.jsx';
import { EmptyState, ErrorMessage, Loading, Toast } from '../components/Feedback.jsx';
import LiveIndicator from '../components/LiveIndicator.jsx';
import { Brand } from '../components/Navbar.jsx';

const REQUEST_TEXT = { call: 'เรียกพนักงานแล้ว พนักงานกำลังมา', bill: 'แจ้งขอเช็กบิลแล้ว กรุณารอสักครู่' };

export default function TableLayout() {
  const { tableId } = useParams();
  const { data: table, error, loading, refresh } = useApi(() => api.getTable(tableId), { deps: [tableId] });
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);

  async function sendRequest(type) {
    setSending(true);
    try {
      // เซิร์ฟเวอร์กันส่งซ้ำ: ถ้ามีคำขอแบบเดียวกันที่ยังไม่ปิด จะคืนรายการเดิม (duplicate)
      const res = await api.createRequest(tableId, type);
      setToast({ type: 'success', text: res.duplicate ? 'ส่งคำขอไปแล้ว กรุณารอสักครู่' : REQUEST_TEXT[type] });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Loading />;
  if (error) {
    return (
      <main className="container page">
        {error.status === 404 ? (
          <EmptyState icon={Armchair} title={`ไม่พบโต๊ะ “${tableId}”`}>
            <p>กรุณาสแกน QR Code บนโต๊ะอีกครั้ง หรือติดต่อพนักงาน</p>
            <Link className="btn btn-primary" to="/">กลับหน้าแรก</Link>
          </EmptyState>
        ) : (
          <ErrorMessage error={error} onRetry={refresh} />
        )}
      </main>
    );
  }

  return (
    <CartProvider tableId={table.id}>
      <header className="navbar customer-bar">
        <div className="navbar-inner container">
          <Brand />
          <div className="row">
            <LiveIndicator />
            <span className="table-tag">โต๊ะ {table.id}</span>
          </div>
        </div>
        <div className="container customer-actions">
          <nav className="tabs">
            <NavLink to="." end><BookOpen size={16} /> เมนู</NavLink>
            <NavLink to="orders"><ClipboardList size={16} /> ออร์เดอร์ของฉัน</NavLink>
          </nav>
          <div className="row actions">
            <button className="btn btn-sm" disabled={sending} onClick={() => sendRequest('call')}><BellRing size={15} /> เรียกพนักงาน</button>
            <button className="btn btn-sm" disabled={sending} onClick={() => sendRequest('bill')}><Receipt size={15} /> เช็กบิล</button>
          </div>
        </div>
      </header>
      <main className="container page">
        <Outlet />
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </CartProvider>
  );
}
