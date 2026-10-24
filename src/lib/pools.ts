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
  /** Tipo de pool: cripto, rwa, stable ou outros. */
  categoria?: string;
  ordem?: string;
  /** Valor hipotético em US$ para estimar o retorno. */
  valor?: string;
}

export const POOL_KINDS = [
  { id: "cripto", label: "Cripto" },
  { id: "rwa", label: "RWA (ativos do mundo real)" },
  { id: "stable", label: "Stablecoins" },
  { id: "outros", label: "Outros" },
] as const;
export type PoolKind = (typeof POOL_KINDS)[number]["id"];

const RWA_PROJECT = /(ondo|maple|centrifuge|goldfinch|clearpool|truefi|credix|backed|openeden|superstate|franklin|matrixdock|securitize|midas|dinari|realt|lofty|spiko|hashnote|plume|mountain|paxos|swarm|tokeny|libre|ether\.fi-liquid-?rwa)/i;
const RWA_SYMBOL = /(^|[-_ ])(BUIDL|USDY|OUSG|USTB|USYC|BENJI|STBT|XAUT|PAXG|USDM|TBILL|BCSPX|CSPX|EUTBL|USTBL|WTGXX|JTRSY|JAAA|OUSD)([-_ ]|$)/i;
/** Ativos de referência do mercado cripto: um pool com algum deles (e que não seja só stablecoin) conta como "Cripto". */
const MAJOR = /(^|[-_ /+])(W?BTC|CBBTC|TBTC|ETH|WETH|STETH|WSTETH|CBETH|RETH|WEETH|SOL|WSOL|JITOSOL|MSOL|BNB|WBNB|AVAX|WAVAX|POL|MATIC|ARB|OP|LINK|UNI|AAVE|CRV|LDO|MKR|ATOM|DOT|ADA|XRP|DOGE|TON|SUI|APT|NEAR|HYPE|CAKE|AERO|VELO|GMX)([-_ /+]|$)/i;

/** Classifica um pool em cripto, RWA, stablecoin ou outros (heurística por protocolo e símbolo). */
export function poolKind(p: DefiPool): PoolKind {
  if (RWA_PROJECT.test(p.project) || RWA_SYMBOL.test(p.symbol)) return "rwa";
  if (p.stablecoin) return "stable";
  if (MAJOR.test(p.symbol)) return "cripto";
  return "outros";
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
  if (POOL_KINDS.some((k) => k.id === sp.categoria)) out = out.filter((p) => poolKind(p) === sp.categoria);
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
