import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

export default function StaffLayout() {
  return (
    <>
      <Navbar />
      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}
