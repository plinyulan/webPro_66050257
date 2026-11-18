import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { TABLE_ID_PATTERN } from '../utils/menu.js';
import { formatPrice } from '../utils/format.js';
import { isActive } from '../utils/status.js';
import { ErrorMessage, Loading, Toast } from '../components/Feedback.jsx';
import { ExternalLink, Plus, QrCode, Trash2 } from 'lucide-react';

// สรุปสถานะโต๊ะจากออร์เดอร์ที่ยังไม่ปิดบิล + คำขอเช็กบิล
export function summarizeTables(orders, requests) {
  const map = {};
  orders.filter((o) => !o.billId && o.status !== 'cancelled').forEach((o) => {
    const t = (map[o.tableId] ??= { active: 0, due: 0, orders: 0, billRequested: false });
    t.orders += 1;
    t.due += o.total;
    if (isActive(o.status)) t.active += 1;
  });
  requests.filter((r) => r.type === 'bill').forEach((r) => {
    (map[r.tableId] ??= { active: 0, due: 0, orders: 0 }).billRequested = true;
  });
  return map;
}

export default function TablesPage() {
  const { isManager } = useAuth();
  const tablesQ = useApi(api.getTables, { live: ['tables'] });
  const ordersQ = useApi(() => api.getOrders(), { live: ['orders'], interval: 15000 });
  const requestsQ = useApi(() => api.getRequests({ status: 'open' }), { live: ['requests'] });
  const [form, setForm] = useState({ id: '', seats: 4 });
  const [formError, setFormError] = useState(null);
  const [toast, setToast] = useState(null);
  const [qrFor, setQrFor] = useState(null);

  const summary = useMemo(() => summarizeTables(ordersQ.data ?? [], requestsQ.data ?? []), [ordersQ.data, requestsQ.data]);
  const tableUrl = (id) => `${window.location.origin}/table/${id}`;

  async function addTable(e) {
    e.preventDefault();
    const id = form.id.trim().toUpperCase();
    const seats = Number(form.seats);
    if (!TABLE_ID_PATTERN.test(id)) return setFormError('รหัสโต๊ะต้องเป็นตัวอักษร 1 ตัว + เลข 2 หลัก เช่น A06');
    if (!(Number.isInteger(seats) && seats >= 1 && seats <= 20)) return setFormError('จำนวนที่นั่งต้องอยู่ระหว่าง 1–20');
    setFormError(null);
    try {
      await api.createTable({ id, seats });
      setForm({ id: '', seats: 4 });
      setToast({ type: 'success', text: `เพิ่มโต๊ะ ${id} แล้ว` });
      tablesQ.refresh();
    } catch (err) {
      setFormError(err.message); // เช่น รหัสซ้ำ (ตรวจที่เซิร์ฟเวอร์)
    }
  }

  async function removeTable(t) {
    if (!window.confirm(`ลบโต๊ะ ${t.id}?`)) return;
    try {
      await api.deleteTable(t.id);
      setToast({ type: 'info', text: `ลบโต๊ะ ${t.id} แล้ว` });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  async function checkout(t, due) {
    if (!window.confirm(`ปิดบิลโต๊ะ ${t.id} ยอด ${formatPrice(due)} ?`)) return;
    try {
      const bill = await api.checkout(t.id);
      setToast({ type: 'success', text: `ปิดบิลโต๊ะ ${t.id} แล้ว ยอด ${formatPrice(bill.total)} (บิล #${bill.id})` });
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>โต๊ะ & บิล</h1>
          <p className="muted small">ดูสถานะโต๊ะ ยอดค้างชำระ และปิดบิล</p>
        </div>
      </div>

      {isManager && (
        <form className="card inline-form" onSubmit={addTable} noValidate>
          <label className="field">
            <span>รหัสโต๊ะ</span>
            <input value={form.id} placeholder="A06" maxLength={3} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          </label>
          <label className="field">
            <span>ที่นั่ง</span>
            <input type="number" min={1} max={20} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit"><Plus size={16} /> เพิ่มโต๊ะ</button>
          {formError && <p className="alert alert-error full">{formError}</p>}
        </form>
      )}

      {tablesQ.loading && <Loading />}
      {tablesQ.error && <ErrorMessage error={tablesQ.error} onRetry={tablesQ.refresh} />}
      <div className="qr-grid">
        {tablesQ.data?.map((t) => {
          const s = summary[t.id];
          const state = !s?.orders ? 'free' : s.billRequested ? 'bill' : s.active ? 'busy' : 'served';
          const label = { free: 'ว่าง', bill: 'ขอเช็กบิล', busy: `รอเสิร์ฟ ${s?.active}`, served: 'เสิร์ฟครบแล้ว' }[state];
          return (
            <div key={t.id} className={`qr-card card table-${state}`}>
              <div className="row between">
                <span className="table-tag lg">โต๊ะ {t.id}</span>
                <span className={`badge state-${state}`}><span className="dot-sm" /> {label}</span>
              </div>
              {qrFor === t.id ? (
                <button className="qr-box" onClick={() => setQrFor(null)} aria-label="ซ่อน QR">
                  <QRCodeSVG value={tableUrl(t.id)} size={150} marginSize={1} />
                  <span className="muted small">{tableUrl(t.id)}</span>
                </button>
              ) : (
                <div className="table-due">
                  <span className="muted small">{t.seats} ที่นั่ง · {s?.orders ?? 0} ออร์เดอร์</span>
                  <strong>{formatPrice(s?.due ?? 0)}</strong>
                </div>
              )}
              <div className="row">
                {s?.orders > 0 && (
                  <button className="btn btn-sm btn-primary" disabled={s.active > 0} title={s.active ? 'ต้องเสิร์ฟให้ครบก่อน' : ''} onClick={() => checkout(t, s.due)}>
                    ปิดบิล
                  </button>
                )}
                <button className="btn btn-sm" aria-label="QR" onClick={() => setQrFor(qrFor === t.id ? null : t.id)}><QrCode size={14} /> QR</button>
                <Link className="icon-btn" to={`/table/${t.id}`} target="_blank" title="เปิดหน้าลูกค้า" aria-label={`เปิดหน้าลูกค้าโต๊ะ ${t.id}`}><ExternalLink size={16} /></Link>
                {isManager && (
                  <button className="icon-btn danger" title="ลบโต๊ะ" aria-label={`ลบโต๊ะ ${t.id}`} onClick={() => removeTable(t)}><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
