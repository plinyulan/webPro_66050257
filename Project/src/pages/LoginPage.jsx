import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Brand } from '../components/Navbar.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const target = location.state?.from || '/staff';

  if (user) return <Navigate to={target} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    setSubmitting(true);
    setError(null);
    try {
      await login(form.username, form.password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit} noValidate>
        <Brand />
        <h1>เข้าสู่ระบบพนักงาน</h1>
        <label className="field">
          <span>ชื่อผู้ใช้</span>
          <input autoComplete="username" value={form.username} onChange={update('username')} autoFocus />
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <input type="password" autoComplete="current-password" value={form.password} onChange={update('password')} />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-primary block" disabled={submitting}>
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        <div className="demo-accounts small muted">
          <div>บัญชีทดลอง</div>
          <div><code>manager</code> / <code>manager123</code> — ผู้จัดการ</div>
          <div><code>staff</code> / <code>staff123</code> — พนักงาน</div>
        </div>
      </form>
    </div>
  );
}
