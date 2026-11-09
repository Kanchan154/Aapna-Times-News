import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errMsg } from '../lib/api';

// const { data, loading, error, reload } = useFetch('/articles', { params })
export default function useFetch(url, { params, skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState('');
  const key = JSON.stringify([url, params]);
  const seq = useRef(0);

  const load = useCallback(async ({ silent } = {}) => {
    if (skip || !url) return;
    const mine = ++seq.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const r = await api.get(url, { params });
      if (mine === seq.current) setData(r.data);
    } catch (e) {
      if (mine === seq.current) setError(errMsg(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skip]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}
