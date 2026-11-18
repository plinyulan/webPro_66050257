import { Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { EmptyState, Loading } from './Feedback.jsx';

// ป้องกันหน้าพนักงาน: ยังไม่ล็อกอิน → ไปหน้า login, บทบาทไม่พอ → แจ้งไม่มีสิทธิ์
export default function RequireAuth({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading text="กำลังตรวจสอบสิทธิ์..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) {
    return <EmptyState icon={Lock} title="หน้านี้สำหรับผู้จัดการเท่านั้น" />;
  }
  return children;
}
