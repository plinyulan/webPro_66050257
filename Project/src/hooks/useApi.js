import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribe } from '../api/live.js';

/**
 * ดึงข้อมูลจาก API พร้อมสถานะ loading / error
 * - live: รายชื่อ resource (เช่น ['orders']) → โหลดใหม่ทันทีเมื่อเซิร์ฟเวอร์แจ้งว่ามีการเปลี่ยนแปลง
 * - interval: ดึงซ้ำเป็นระยะ (สำรองกรณีการเชื่อมต่อ real-time หลุด)
 */
export function useApi(fetcher, { live = [], interval = 0, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);
  const liveKey = live.join(',');

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refresh = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (mountedRef.current) setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    refresh();
    const id = interval ? setInterval(refresh, interval) : null;
    const resources = liveKey ? liveKey.split(',') : [];
    const unsubscribe = resources.length ? subscribe((r) => resources.includes(r) && refresh()) : null;
    return () => {
      mountedRef.current = false;
      if (id) clearInterval(id);
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, interval, liveKey, ...deps]);

  return { data, error, loading, refresh };
}
