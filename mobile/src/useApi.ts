import { useCallback, useEffect, useState } from "react";
import { get } from "./api";

/** Busca um endereço da API do site. `reload` serve para puxar para atualizar. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const r = await get<T>(path);
    if ("data" in r) { setData(r.data); setError(null); } else setError(r.error);
    setLoading(false);
  }, [path]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload };
}
