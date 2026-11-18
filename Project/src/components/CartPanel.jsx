import { useState } from 'react';
import { ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';
import QtyStepper from './QtyStepper.jsx';
import { MenuThumb } from './icons.jsx';

// ตะกร้า: desktop = แถบด้านข้าง, mobile = ปุ่มลอยด้านล่างที่เปิดเป็น bottom sheet
export default function CartPanel({ tableId, onCheckout }) {
  const { items, dispatch, total, count } = useCart();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onCheckout(note);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {count > 0 && (
        <button className="cart-fab" onClick={() => setOpen(true)}>
          <span className="row"><ShoppingBag size={18} /> ตะกร้า · <span key={count} className="bump">{count}</span> รายการ</span>
          <strong key={total} className="bump">{formatPrice(total)}</strong>
        </button>
      )}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <aside className={`cart-panel card ${open ? 'open' : ''}`} aria-label="ตะกร้าอาหาร">
        <div className="cart-head">
          <h2>ตะกร้า</h2>
          <span className="muted small">โต๊ะ {tableId}</span>
          <button className="icon-btn hide-desktop" aria-label="ปิดตะกร้า" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={22} strokeWidth={1.5} aria-hidden />
            <p>ยังไม่มีรายการ เลือกเมนูที่ต้องการได้เลย</p>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((i) => (
                <li key={i.menuId}>
                  <MenuThumb categoryId={i.categoryId} size="sm" />
                  <div className="grow">
                    <div className="cart-name">{i.name}</div>
                    <div className="muted small">{formatPrice(i.price * i.qty)}</div>
                  </div>
                  <QtyStepper value={i.qty} onChange={(qty) => dispatch({ type: 'SET_QTY', menuId: i.menuId, qty })} />
                  <button className="icon-btn" aria-label={`ลบ ${i.name}`} onClick={() => dispatch({ type: 'REMOVE', menuId: i.menuId })}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>

            <label className="field">
              <span>หมายเหตุถึงครัว</span>
              <textarea rows={2} maxLength={150} value={note} placeholder="เช่น ไม่ใส่ผักชี, ขอน้ำซุปเพิ่ม" onChange={(e) => setNote(e.target.value)} />
            </label>

            <div className="cart-total">
              <span className="muted">รวม {count} รายการ</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {error && <p className="alert alert-error">{error}</p>}

            {confirming ? (
              <div className="confirm-box">
                <p>ยืนยันสั่งอาหาร {count} รายการ ให้โต๊ะ <b>{tableId}</b>?</p>
                <div className="row">
                  <button className="btn" disabled={submitting} onClick={() => setConfirming(false)}>แก้ไข</button>
                  <button className="btn btn-primary grow" disabled={submitting} onClick={handleConfirm}>
                    {submitting ? 'กำลังส่ง...' : 'ยืนยันการสั่งอาหาร'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="row">
                <button className="btn btn-ghost" onClick={() => dispatch({ type: 'CLEAR' })}>ล้างตะกร้า</button>
                <button className="btn btn-primary grow" onClick={() => setConfirming(true)}>สั่งอาหาร</button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
