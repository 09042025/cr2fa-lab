import type { DefiPool } from "./market";

export interface PoolFilters {
  rede?: string;
  q?: string;
  min?: string;
  stable?: string;
  ordem?: string;
}

export function filterPools(pools: DefiPool[], sp: PoolFilters): DefiPool[] {
  const min = Number(sp.min) || 0;
  const q = (sp.q || "").trim().toLowerCase();
  let out = pools.filter((p) => p.tvlUsd >= min);
  if (sp.rede) out = out.filter((p) => p.chain === sp.rede);
  if (sp.stable === "1") out = out.filter((p) => p.stablecoin);
  if (q) out = out.filter((p) => p.symbol.toLowerCase().includes(q) || p.project.toLowerCase().includes(q));
  const key = sp.ordem === "apy" ? "apy" : "tvlUsd";
  return [...out].sort((a, b) => ((b[key] ?? -1) as number) - ((a[key] ?? -1) as number));
}

/** Escapa um campo CSV e neutraliza injeção de fórmulas em planilhas. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
