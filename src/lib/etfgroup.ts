/** Filtros de período e agrupamento (dia, mês, ano) do fluxo dos ETFs. `rows[].date` no formato AAAA-MM-DD; totais em US$ milhões. */
export type EtfRow = { date: string; total: number | null };
export type Group = "dia" | "mes" | "ano";
export const PERIODS: [string, string, number | null][] = [["30d", "30 dias", 30], ["90d", "90 dias", 90], ["6m", "6 meses", 182], ["1a", "1 ano", 365], ["tudo", "Tudo", null]];
export const GROUPS: [Group, string][] = [["dia", "Dias"], ["mes", "Meses"], ["ano", "Anos"]];

/** Linhas dentro do período (em dias corridos até a última data da tabela). days=null devolve tudo. */
export function periodRows<T extends { date: string }>(rows: T[], days: number | null): T[] {
  if (days === null || rows.length === 0) return rows;
  const end = new Date(rows[rows.length - 1].date + "T00:00:00Z").getTime();
  const from = end - (days - 1) * 86400000;
  return rows.filter((r) => new Date(r.date + "T00:00:00Z").getTime() >= from);
}

/** Soma o fluxo por dia, mês ou ano. O rótulo é DD/MM, MM/AA ou AAAA. */
export function groupFlows(rows: EtfRow[], g: Group): { label: string; total: number }[] {
  if (g === "dia") return rows.map((r) => ({ label: r.date.slice(8, 10) + "/" + r.date.slice(5, 7), total: r.total ?? 0 }));
  const map = new Map<string, number>();
  for (const r of rows) { const k = g === "mes" ? r.date.slice(0, 7) : r.date.slice(0, 4); map.set(k, (map.get(k) ?? 0) + (r.total ?? 0)); }
  return [...map].map(([k, total]) => ({ label: g === "mes" ? `${k.slice(5, 7)}/${k.slice(2, 4)}` : k, total }));
}
