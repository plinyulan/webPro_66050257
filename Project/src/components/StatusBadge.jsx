import { CircleCheck, CircleX, Clock, Flame } from 'lucide-react';
import { ORDER_STATUS } from '../utils/status.js';

export const STATUS_ICON = { pending: Clock, preparing: Flame, served: CircleCheck, cancelled: CircleX };

export default function StatusBadge({ status }) {
  const Icon = STATUS_ICON[status] ?? Clock;
  return (
    <span className={`badge badge-${status}`}>
      <Icon size={13} strokeWidth={2} aria-hidden /> {ORDER_STATUS[status]?.label ?? status}
    </span>
  );
}
