import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CookingPot, LogOut, Menu, UserRound, X } from 'lucide-react';
import { ROLE_LABEL, useAuth } from '../context/AuthContext.jsx';
import LiveIndicator from './LiveIndicator.jsx';

const LINKS = [
  { to: '/staff', label: 'ออร์เดอร์', end: true },
  { to: '/staff/tables', label: 'โต๊ะ & บิล' },
  { to: '/staff/menu', label: 'เมนู' },
  { to: '/staff/bills', label: 'ประวัติบิล' },
];

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark"><CookingPot size={16} strokeWidth={2} /></span>
      Suki House
    </span>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  async function handleLogout() {
    close();
    await logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <Link to="/" onClick={close}><Brand /></Link>
        {user && <LiveIndicator />}
        <button className="icon-btn nav-toggle" aria-label="เปิดเมนู" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          {user ? (
            <>
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={close}>
                  {l.label}
                </NavLink>
              ))}
              <span className="nav-sep" />
              <span className="user-chip" title={user.name}>
                <span className="avatar"><UserRound size={14} /></span>
                {ROLE_LABEL[user.role]}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <LogOut size={15} /> ออกจากระบบ
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={close}>เข้าสู่ระบบพนักงาน</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
