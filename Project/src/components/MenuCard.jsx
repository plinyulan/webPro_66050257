import { Plus } from 'lucide-react';
import { formatPrice } from '../utils/format.js';
import { MenuThumb } from './icons.jsx';

export default function MenuCard({ item, inCart = 0, onAdd }) {
  return (
    <article className={`menu-card ${item.available ? '' : 'sold-out'}`}>
      <MenuThumb categoryId={item.categoryId} />
      <div className="menu-info">
        <h3>{item.name}</h3>
        <p className="muted small clamp">{item.description}</p>
        <div className="menu-bottom">
          <span className="price">{formatPrice(item.price)}</span>
          {item.available ? (
            <button className={`add-btn ${inCart ? 'has' : ''}`} aria-label={`เพิ่ม ${item.name}`} onClick={() => onAdd(item)}>
              {inCart > 0 ? <span key={inCart} className="bump">{inCart}</span> : <Plus size={18} strokeWidth={2} />}
            </button>
          ) : (
            <span className="tag">หมด</span>
          )}
        </div>
      </div>
    </article>
  );
}
