import { LayoutGrid } from 'lucide-react';
import { CategoryIcon } from './icons.jsx';

export default function CategoryFilter({ categories, value, onChange, allLabel = 'ทั้งหมด' }) {
  const options = [{ id: 'all', name: allLabel }, ...categories];
  return (
    <div className="chips" role="tablist">
      {options.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={value === c.id}
          className={`chip ${value === c.id ? 'active' : ''}`}
          onClick={() => onChange(c.id)}
        >
          {c.id === 'all' ? <LayoutGrid size={15} strokeWidth={1.75} aria-hidden /> : <CategoryIcon categoryId={c.id} size={15} />}
          {c.name}
        </button>
      ))}
    </div>
  );
}
