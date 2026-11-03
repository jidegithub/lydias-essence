import { useCallback, useEffect, useRef, useState } from "react";
import { toFriendlyError } from "@lydias-essence/supabase";

export interface Resource<T> {
  data: T | null;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
}

/** Tiny data-loading hook: loads on mount, exposes loading/error, and can be reloaded. */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;
  const alive = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchRef.current();
      if (alive.current) setData(result);
    } catch (err) {
      if (alive.current) setError(toFriendlyError(err, "We couldn’t load this page.").message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: run };
}
