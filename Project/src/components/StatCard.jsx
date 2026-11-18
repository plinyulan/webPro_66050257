export default function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  return (
    <div className={`stat-card card tone-${tone}`}>
      <div className="stat-top">
        <span className="muted small">{label}</span>
        {Icon && <Icon size={16} strokeWidth={1.75} className="stat-icon" aria-hidden />}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
