import { Link } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function HomePage() {
  const { data: tables, error, loading, refresh } = useApi(api.getTables);

  return (
    <>
      <section className="hero">
        <span className="eyebrow">ระบบสั่งอาหารผ่านโต๊ะ</span>
        <h1>สั่งง่าย ครัวเห็นทันที</h1>
        <p className="muted">ลูกค้าสแกน QR สั่งอาหารเอง · ออร์เดอร์ขึ้นหน้าจอพนักงานแบบ real-time · ติดตามสถานะได้ตลอด</p>
        <Link className="btn btn-primary" to="/staff">สำหรับพนักงาน <ArrowRight size={16} /></Link>
      </section>

      <div className="section-head">
        <div>
          <h2>เลือกโต๊ะ</h2>
          <p className="muted small"><QrCode size={14} className="inline-icon" /> ในร้านจริงลูกค้าจะสแกน QR ที่โต๊ะ — ส่วนนี้มีไว้ทดลอง</p>
        </div>
      </div>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={refresh} />}
      {tables && (
        <div className="table-grid">
          {tables.map((t) => (
            <Link key={t.id} to={`/table/${t.id}`} className="table-tile card">
              <span className="table-id">{t.id}</span>
              <span className="muted small">{t.seats} ที่นั่ง</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
