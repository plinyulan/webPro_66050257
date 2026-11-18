import { useEffect, useState } from 'react';
import { subscribeStatus } from '../api/live.js';

export function useLiveStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => subscribeStatus(setConnected), []);
  return connected;
}
