import { useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../api/client.js';

/**
 * Small data-fetching hook.
 * `deps` re-runs the request; `null` deps loads once.
 */
export function useApi(path, deps = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.get(path));
    } catch (err) {
      setError(err instanceof ApiError ? err : new Error('Failed to load data.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ? deps : [path]);

  return { data, loading, error, reload: load, setData };
}

export default useApi;