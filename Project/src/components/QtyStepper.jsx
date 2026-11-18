import { Minus, Plus } from 'lucide-react';
import { MAX_QTY } from '../context/cartReducer.js';

export default function QtyStepper({ value, onChange }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="ลดจำนวน" onClick={() => onChange(value - 1)}><Minus size={14} /></button>
      <span aria-live="polite"><span key={value} className="bump">{value}</span></span>
      <button type="button" aria-label="เพิ่มจำนวน" disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)}><Plus size={14} /></button>
    </div>
  );
}
