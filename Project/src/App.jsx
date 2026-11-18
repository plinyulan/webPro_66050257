import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import StaffLayout from './layouts/StaffLayout.jsx';
import TableLayout from './layouts/TableLayout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import CustomerOrdersPage from './pages/CustomerOrdersPage.jsx';
import StaffDashboardPage from './pages/StaffDashboardPage.jsx';
import MenuManagementPage from './pages/MenuManagementPage.jsx';
import TablesPage from './pages/TablesPage.jsx';
import BillsPage from './pages/BillsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* หน้าแรก + หน้าพนักงาน (ต้องเข้าสู่ระบบ) */}
        <Route element={<StaffLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff" element={<RequireAuth><StaffDashboardPage /></RequireAuth>} />
          <Route path="/staff/tables" element={<RequireAuth><TablesPage /></RequireAuth>} />
          <Route path="/staff/menu" element={<RequireAuth><MenuManagementPage /></RequireAuth>} />
          <Route path="/staff/bills" element={<RequireAuth><BillsPage /></RequireAuth>} />
        </Route>

        {/* หน้าฝั่งลูกค้า: เปิดจาก QR Code ของโต๊ะ เช่น /table/A05 */}
        <Route path="/table/:tableId" element={<TableLayout />}>
          <Route index element={<MenuPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
