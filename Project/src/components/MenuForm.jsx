import { useState } from 'react';
import { validateMenuItem } from '../utils/menu.js';

const EMPTY = { name: '', price: '', categoryId: '', description: '', available: true };

// ฟอร์มเพิ่ม/แก้ไขเมนู (parent ส่ง key ใหม่เมื่อเปลี่ยนรายการที่แก้ เพื่อรีเซ็ตฟอร์ม)
export default function MenuForm({ initial, categories, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial, price: initial?.price ?? '' }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const isEdit = Boolean(initial?.id);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateMenuItem(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        price: Number(form.price),
        categoryId: form.categoryId,
        description: form.description.trim(),
        available: form.available,
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card menu-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEdit ? `แก้ไขเมนู: ${initial.name}` : 'เพิ่มเมนูใหม่'}</h2>
      <div className="form-grid">
        <label className="field">
          <span>ชื่อเมนู *</span>
          <input value={form.name} onChange={update('name')} aria-invalid={!!errors.name} />
          {errors.name && <small className="error">{errors.name}</small>}
        </label>
        <label className="field">
          <span>ราคา (บาท) *</span>
          <input type="number" min="1" inputMode="numeric" value={form.price} onChange={update('price')} aria-invalid={!!errors.price} />
          {errors.price && <small className="error">{errors.price}</small>}
        </label>
        <label className="field">
          <span>หมวดหมู่ *</span>
          <select value={form.categoryId} onChange={update('categoryId')} aria-invalid={!!errors.categoryId}>
            <option value="">— เลือก —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.categoryId && <small className="error">{errors.categoryId}</small>}
        </label>
        <label className="field">
          <span>คำอธิบาย</span>
          <input value={form.description} maxLength={80} onChange={update('description')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.available} onChange={update('available')} /> พร้อมขาย
        </label>
      </div>
      {serverError && <p className="alert alert-error">{serverError}</p>}
      <div className="row end">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>ยกเลิก</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'}
        </button>
      </div>
    </form>
  );
}
