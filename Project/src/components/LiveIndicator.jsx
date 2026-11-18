import { useLiveStatus } from '../hooks/useLiveStatus.js';

export default function LiveIndicator() {
  const connected = useLiveStatus();
  return (
    <span className={`live ${connected ? 'on' : ''}`} title={connected ? 'เชื่อมต่อแบบ real-time' : 'กำลังเชื่อมต่อใหม่...'}>
      <span className="live-dot" /> {connected ? 'Live' : 'Offline'}
    </span>
  );
}
