import type { DefiPool } from "./market";

export interface PoolFilters {
  /** "liquidez" (pares em DEX, padrão) ou "rendimento" (empréstimo, staking e afins). */
  tipo?: string;
  rede?: string;
  /** Protocolo/DEX, igual ao slug do DefiLlama (ex.: uniswap-v3). */
  dex?: string;
  q?: string;
  /** TVL mínimo em US$. */
  min?: string;
  /** Volume mínimo de 24h em US$ (só pools de DEX). */
  vol?: string;
  stable?: string;
  ordem?: string;
  /** Valor hipotético em US$ para estimar o retorno. */
  valor?: string;
}

export const POOL_SORTS = ["tvl", "apy", "vol", "taxas", "eficiencia"] as const;

/** Volume de 24h dividido pelo TVL: quanto o pool "gira" por dia. */
export function turnover(p: DefiPool): number | null {
  if (p.volumeUsd1d === null || !p.tvlUsd) return null;
  return p.volumeUsd1d / p.tvlUsd;
}

/** Retorno estimado em 30 dias para um valor investido, usando o APY atual. Não considera perda impermanente. */
export function estimateMonthly(valueUsd: number, apy: number | null): number | null {
  if (apy === null || !Number.isFinite(apy) || !Number.isFinite(valueUsd) || valueUsd <= 0) return null;
  return (valueUsd * (apy / 100)) / 12;
}

function sortValue(p: DefiPool, ordem: string): number {
  switch (ordem) {
    case "apy":
      return p.apy ?? -1;
    case "vol":
      return p.volumeUsd1d ?? -1;
    case "taxas":
      return p.apyBase ?? -1;
    case "eficiencia":
      return turnover(p) ?? -1;
    default:
      return p.tvlUsd;
  }
}

export function filterPools(pools: DefiPool[], sp: PoolFilters): DefiPool[] {
  const min = Number(sp.min) || 0;
  const minVol = Number(sp.vol) || 0;
  const q = (sp.q || "").trim().toLowerCase();
  let out = pools.filter((p) => p.tvlUsd >= min);
  if (sp.tipo === "rendimento") out = out.filter((p) => !p.dex);
  else if (sp.tipo === "liquidez") out = out.filter((p) => p.dex);
  if (sp.rede) out = out.filter((p) => p.chain === sp.rede);
  if (sp.dex) out = out.filter((p) => p.project === sp.dex);
  if (minVol > 0) out = out.filter((p) => (p.volumeUsd1d ?? 0) >= minVol);
  if (sp.stable === "1") out = out.filter((p) => p.stablecoin);
  if (q) out = out.filter((p) => p.symbol.toLowerCase().includes(q) || p.project.toLowerCase().includes(q) || (p.poolMeta ?? "").toLowerCase().includes(q));
  const ordem = POOL_SORTS.includes(sp.ordem as (typeof POOL_SORTS)[number]) ? (sp.ordem as string) : "tvl";
  return [...out].sort((a, b) => sortValue(b, ordem) - sortValue(a, ordem));
}

/** Escapa um campo CSV e neutraliza injeção de fórmulas em planilhas. */
export function csvCell(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
