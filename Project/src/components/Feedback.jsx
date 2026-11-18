import { useEffect, useRef } from 'react';
import { CircleAlert, CircleCheck, Info, Inbox, RotateCw } from 'lucide-react';

export function Loading({ text = 'กำลังโหลด...' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> {text}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={16} aria-hidden />
      <span className="grow">{error?.message || String(error)}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}><RotateCw size={14} /> ลองใหม่</button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon size={22} strokeWidth={1.5} aria-hidden /></span>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

const TOAST_ICON = { success: CircleCheck, error: CircleAlert, info: Info };

// แจ้งเตือนชั่วคราว หายเองใน 3.5 วินาที
export function Toast({ toast, onClose }) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => closeRef.current(), 3500);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  const Icon = TOAST_ICON[toast.type] ?? Info;
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status" onClick={onClose}>
      <Icon size={16} aria-hidden /> {toast.text}
    </div>
  );
}
