import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { filterMenu } from '../utils/menu.js';
import { formatPrice } from '../utils/format.js';
import { Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import MenuForm from '../components/MenuForm.jsx';
import { CategoryIcon, MenuThumb } from '../components/icons.jsx';
import SearchBar from '../components/SearchBar.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import { EmptyState, ErrorMessage, Loading, Toast } from '../components/Feedback.jsx';

export default function MenuManagementPage() {
  const { isManager } = useAuth();
  const menuQ = useApi(api.getMenu, { live: ['menu'] });
  const catQ = useApi(api.getCategories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState(null); // null = ปิดฟอร์ม, {} = เพิ่มใหม่, {id,...} = แก้ไข
  const [toast, setToast] = useState(null);

  const categories = catQ.data ?? [];
  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
  const filtered = useMemo(() => filterMenu(menuQ.data ?? [], { search, category }), [menuQ.data, search, category]);

  async function handleSubmit(values) {
    if (editing?.id) {
      await api.updateMenuItem(editing.id, values);
      setToast({ type: 'success', text: `บันทึก “${values.name}” แล้ว` });
    } else {
      await api.createMenuItem(values);
      setToast({ type: 'success', text: `เพิ่ม “${values.name}” แล้ว` });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditing(null);
    menuQ.refresh();
  }

  async function toggleAvailable(item) {
    try {
      await api.updateMenuItem(item.id, { available: !item.available });
      menuQ.refresh();
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`ลบเมนู “${item.name}” ถาวร?`)) return;
    try {
      await api.deleteMenuItem(item.id);
      setToast({ type: 'info', text: `ลบ “${item.name}” แล้ว` });
      if (editing?.id === item.id) setEditing(null);
      menuQ.refresh();
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>เมนูอาหาร</h1>
          <p className="muted small">{menuQ.data?.length ?? 0} รายการ · {menuQ.data?.filter((m) => !m.available).length ?? 0} หมด</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> เมนูใหม่</button>
        )}
      </div>
      {!isManager && <p className="alert alert-info">บัญชีพนักงานเปิด/ปิดการขายได้ (เช่น ของหมด) — การเพิ่ม แก้ไข หรือลบเมนูทำได้เฉพาะผู้จัดการ</p>}

      {editing && isManager && (
        <MenuForm key={editing.id ?? 'new'} initial={editing} categories={categories} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
      )}

      <div className="toolbar">
        <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาชื่อเมนู" />
      </div>
      <CategoryFilter categories={categories} value={category} onChange={setCategory} />

      {menuQ.loading && <Loading />}
      {menuQ.error && <ErrorMessage error={menuQ.error} onRetry={menuQ.refresh} />}
      {menuQ.data && filtered.length === 0 && <EmptyState icon={SearchX} title="ไม่พบเมนู" />}

      {filtered.length > 0 && (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>เมนู</th>
                <th>หมวดหมู่</th>
                <th className="num">ราคา</th>
                <th>สถานะ</th>
                {isManager && <th className="num">จัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={item.available ? '' : 'row-muted'}>
                  <td data-label="เมนู" className="menu-name-cell">
                    <span className="row nowrap">
                      <MenuThumb categoryId={item.categoryId} size="sm" /> {item.name}
                    </span>
                  </td>
                  <td data-label="หมวดหมู่">
                    <span className="row nowrap muted"><CategoryIcon categoryId={item.categoryId} size={14} /> {catName[item.categoryId] ?? '-'}</span>
                  </td>
                  <td data-label="ราคา" className="num">{formatPrice(item.price)}</td>
                  <td data-label="สถานะ">
                    <button className={`switch ${item.available ? 'on' : ''}`} role="switch" aria-checked={item.available} onClick={() => toggleAvailable(item)}>
                      {item.available ? 'พร้อมขาย' : 'หมด'}
                    </button>
                  </td>
                  {isManager && (
                    <td className="num actions">
                      <button className="icon-btn" aria-label={`แก้ไข ${item.name}`} title="แก้ไข" onClick={() => { setEditing(item); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Pencil size={16} /></button>
                      <button className="icon-btn danger" aria-label={`ลบ ${item.name}`} title="ลบ" onClick={() => handleDelete(item)}><Trash2 size={16} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
