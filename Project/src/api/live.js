// Real-time: เปิดการเชื่อมต่อ Server-Sent Events เส้นเดียว แล้วแจกจ่ายให้ทุก component ที่สนใจ
const listeners = new Set(); // (resource) => void
const statusListeners = new Set(); // (connected) => void
let source = null;
let connected = false;

function setConnected(value) {
  connected = value;
  statusListeners.forEach((fn) => fn(value));
}

function ensureSource() {
  if (source || typeof EventSource === 'undefined') return;
  source = new EventSource('/api/events');
  source.onopen = () => setConnected(true);
  source.onerror = () => setConnected(false); // EventSource จะต่อใหม่เองอัตโนมัติ
  source.onmessage = (e) => {
    try {
      const { resource } = JSON.parse(e.data);
      listeners.forEach((fn) => fn(resource));
    } catch {
      /* ignore malformed */
    }
  };
}

function maybeClose() {
  if (source && listeners.size === 0 && statusListeners.size === 0) {
    source.close();
    source = null;
    setConnected(false);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  ensureSource();
  return () => {
    listeners.delete(fn);
    maybeClose();
  };
}

export function subscribeStatus(fn) {
  statusListeners.add(fn);
  ensureSource();
  fn(connected);
  return () => {
    statusListeners.delete(fn);
    maybeClose();
  };
}
