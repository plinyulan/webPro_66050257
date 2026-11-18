import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/Feedback.jsx';

export default function NotFoundPage() {
  return (
    <main className="container page">
      <EmptyState icon={Compass} title="404 — ไม่พบหน้านี้">
        <Link className="btn btn-primary" to="/">กลับหน้าแรก</Link>
      </EmptyState>
    </main>
  );
}
