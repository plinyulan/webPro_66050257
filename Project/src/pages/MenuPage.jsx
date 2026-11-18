import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, SearchX } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useCart } from '../context/CartContext.jsx';
import { filterMenu } from '../utils/menu.js';
import SearchBar from '../components/SearchBar.jsx';
import CategoryFilter from '../components/CategoryFilter.jsx';
import MenuCard from '../components/MenuCard.jsx';
import CartPanel from '../components/CartPanel.jsx';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function MenuPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { items, dispatch } = useCart();
  const menuQ = useApi(api.getMenu, { live: ['menu'] }); // เมนูหมด/ราคาเปลี่ยน → อัปเดตทันที
  const catQ = useApi(api.getCategories);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(
    () => filterMenu(menuQ.data ?? [], { search, category, sort, onlyAvailable }),
    [menuQ.data, search, category, sort, onlyAvailable],
  );
  const qtyInCart = useMemo(() => Object.fromEntries(items.map((i) => [i.menuId, i.qty])), [items]);

  async function placeOrder(note) {
    // ส่งแค่ menuId + จำนวน: เซิร์ฟเวอร์ตรวจว่าเมนูยังขายอยู่ และคำนวณราคาจากข้อมูลล่าสุดเอง
    try {
      const order = await api.createOrder({ tableId, note, items: items.map((i) => ({ menuId: i.menuId, qty: i.qty })) });
      dispatch({ type: 'CLEAR' });
      navigate(`/table/${tableId}/orders`, { state: { newOrderId: order.id } });
    } catch (err) {
      if (err.status === 409) menuQ.refresh(); // มีเมนูหมด → โหลดเมนูใหม่ให้เห็นป้าย "หมด"
      throw err;
    }
  }

  return (
    <div className="menu-layout">
      <section>
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="ค้นหาเมนู เช่น หมู, กุ้ง" />
          <select className="pill-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงลำดับ">
            <option value="default">เรียงตามปกติ</option>
            <option value="price-asc">ราคา น้อย → มาก</option>
            <option value="price-desc">ราคา มาก → น้อย</option>
          </select>
          <button
            type="button"
            className={`chip toggle ${onlyAvailable ? 'active' : ''}`}
            aria-pressed={onlyAvailable}
            onClick={() => setOnlyAvailable((v) => !v)}
          >
            <span className="toggle-box">{onlyAvailable && <Check size={12} strokeWidth={3} />}</span>
            เฉพาะที่มีขาย
          </button>
        </div>
        {catQ.data && <CategoryFilter categories={catQ.data} value={category} onChange={setCategory} />}

        {menuQ.loading && <Loading />}
        {menuQ.error && <ErrorMessage error={menuQ.error} onRetry={menuQ.refresh} />}
        {menuQ.data && filtered.length === 0 && <EmptyState icon={SearchX} title="ไม่พบเมนูที่ค้นหา" />}
        <div className="menu-grid">
          {filtered.map((item) => (
            <MenuCard key={item.id} item={item} inCart={qtyInCart[item.id] || 0} onAdd={(it) => dispatch({ type: 'ADD', item: it })} />
          ))}
        </div>
      </section>
      <CartPanel tableId={tableId} onCheckout={placeOrder} />
    </div>
  );
}
