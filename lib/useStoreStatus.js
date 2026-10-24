'use client';
import { useEffect, useState } from 'react';
import { fetchStoreStatus } from '@/lib/storeHours';

// Live store status (open / closed / paused, pre-orders on, ready-in time) for
// the chosen store, refreshed every minute. null while loading or on failure,
// so the page looks exactly as it did before pre-orders existed.
export function useStoreStatus(location, orderType = 'pickup') {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!location) return undefined;
    let alive = true;
    const load = () => fetchStoreStatus(location, orderType).then((s) => { if (alive) setStatus(s); });
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [location, orderType]);
  return status;
}
