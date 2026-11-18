import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'ค้นหา...' }) {
  return (
    <div className="search-bar">
      <Search size={16} className="muted" aria-hidden />
      <input type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
      {value && (
        <button type="button" className="icon-btn" aria-label="ล้างคำค้นหา" onClick={() => onChange('')}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}
