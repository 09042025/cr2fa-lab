/** Ordenação das listas de ações/FIIs/REITs (parâmetro ?ordem=). */
export const SORT_OPTIONS: [string, string][] = [
  ["", "Padrão (nome)"],
  ["volume", "Maior volume"],
  ["mercado", "Maior valor de mercado"],
  ["mercado_asc", "Menor valor de mercado"],
  ["alta", "Maiores altas do dia"],
  ["baixa", "Maiores quedas do dia"],
  ["preco", "Maior preço"],
  ["atencao", "Mais pontos de atenção"],
  ["atencao_asc", "Menos pontos de atenção"],
];

interface Item { price: number | null; changePct: number | null; volume: number | null }
interface Ex { mc: number | null; a: { points: number; total: number } | null }

/** Itens sem o dado (null) ficam sempre no fim, qualquer que seja o sentido. */
export function sortRows<T extends Item & { symbol: string }>(rows: T[], ordem: string | undefined, ex: (s: string) => Ex | undefined): T[] {
  if (!ordem) return rows;
  const key = (r: T): number | null => {
    const e = ex(r.symbol);
    switch (ordem) {
      case "volume": return r.volume;
      case "mercado": case "mercado_asc": return e?.mc ?? null;
      case "alta": case "baixa": return r.changePct;
      case "preco": return r.price;
      case "atencao": case "atencao_asc": return e?.a && e.a.total > 0 ? e.a.points / e.a.total : null;
      default: return null;
    }
  };
  const asc = ordem === "mercado_asc" || ordem === "baixa" || ordem === "atencao_asc";
  return [...rows].sort((x, y) => {
    const a = key(x), b = key(y);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return asc ? a - b : b - a;
  });
}

export const validOrdem = (o?: string) => (SORT_OPTIONS.some(([v]) => v === o) ? o : undefined);
