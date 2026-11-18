import { Check } from 'lucide-react';
import { ORDER_STATUS, STATUS_FLOW } from '../utils/status.js';

export default function OrderProgress({ status }) {
  const current = STATUS_FLOW.indexOf(status);
  return (
    <ol className="progress">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className={i <= current ? 'done' : ''}>
          <span className="dot">{i <= current ? <Check size={13} strokeWidth={2.5} /> : i + 1}</span>
          <span className="small">{ORDER_STATUS[s].label}</span>
        </li>
      ))}
    </ol>
  );
}
