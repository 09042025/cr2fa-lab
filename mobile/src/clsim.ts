/**
 * Simulador de liquidez concentrada (estilo Uniswap v3). Preços sempre como "token B por token A".
 * É uma ESTIMATIVA educativa: usa o volume e o TVL de hoje e não considera a perda impermanente nos ganhos.
 * Este arquivo é copiado em mobile/src/clsim.ts: mantenha os dois iguais.
 */

const sq = Math.sqrt;

/** Quanto de liquidez 1 dólar rende no intervalo [pa, pb] em relação à faixa total (1 = faixa total). 0 se o preço está fora. */
export function concentration(p: number, pa: number, pb: number): number {
  if (!(p > 0) || !(pa >= 0) || !(pb > pa) || p < pa || p > pb) return 0;
  const hi = Number.isFinite(pb) ? p / sq(pb) : 0;
  const denom = 2 * sq(p) - hi - sq(pa);
  return denom > 0 ? (2 * sq(p)) / denom : 0;
}

/** APR (%) das taxas para a faixa total: volume 24h × taxa × 365 ÷ TVL. */
export function fullRangeApr(volume24h: number | null, feeRate: number | null, tvl: number): number | null {
  if (volume24h === null || feeRate === null || !(tvl > 0)) return null;
  return ((volume24h * feeRate * 365) / tvl) * 100;
}

export interface Split { fracA: number; fracB: number }
/** Como o valor se divide entre os dois tokens ao entrar no intervalo [pa, pb] com o preço atual p. */
export function split(p: number, pa: number, pb: number): Split | null {
  if (!(p > 0) || !(pb > pa)) return null;
  if (p <= pa) return { fracA: 1, fracB: 0 };
  if (p >= pb) return { fracA: 0, fracB: 1 };
  const x = 1 / sq(p) - (Number.isFinite(pb) ? 1 / sq(pb) : 0); // token A por unidade de liquidez
  const y = sq(p) - sq(pa); // token B por unidade de liquidez
  const a = x * p;
  return { fracA: a / (a + y), fracB: y / (a + y) };
}

export interface Earning { inRange: boolean; factor: number; apr: number | null; day: number | null; month: number | null; year: number | null }
/**
 * Ganho estimado em US$ para `value` dólares colocados no intervalo.
 * Sua parte das taxas = sua liquidez ÷ (liquidez ativa do pool + a sua). `poolValueUsd` é o valor, em faixa total, da liquidez ATIVA hoje
 * no preço atual (lida da blockchain). Sem esse dado, usa o TVL, que costuma superestimar o ganho em pools concentrados.
 */
export function earnings(value: number, p: number, pa: number, pb: number, fees24h: number | null, poolValueUsd: number): Earning {
  const factor = concentration(p, pa, pb);
  if (fees24h === null || !(value > 0) || !(poolValueUsd > 0)) return { inRange: factor > 0, factor, apr: null, day: null, month: null, year: null };
  const r = (value * factor) / poolValueUsd; // liquidez do usuário ÷ liquidez ativa do pool
  const day = factor > 0 ? fees24h * (r / (1 + r)) : 0;
  return { inRange: factor > 0, factor, apr: (day * 365 / value) * 100, day, month: (day * 365) / 12, year: day * 365 };
}

/** Valor (em token B) de uma posição com liquidez L quando o preço vai para p2. */
function positionValue(L: number, p2: number, pa: number, pb: number): number {
  const hi = Number.isFinite(pb) ? 1 / sq(pb) : 0;
  if (p2 <= pa) return L * p2 * (1 / sq(pa) - hi);
  if (p2 >= pb) return L * (sq(pb) - sq(pa));
  return L * (p2 * (1 / sq(p2) - hi) + sq(p2) - sq(pa));
}

/** Perda impermanente (%) se o preço variar `change` (ex.: -0.2 = cai 20%), comparado a só segurar os tokens. Negativo = perda. */
export function impermanentLoss(p: number, pa: number, pb: number, change: number): number | null {
  const sp = split(p, pa, pb);
  if (!sp || !(p > 0)) return null;
  const hi = Number.isFinite(pb) ? 1 / sq(pb) : 0;
  const den = p * (1 / sq(p) - hi) + sq(p) - sq(pa);
  if (!(den > 0)) return null;
  const L = 1 / den; // posição de valor 1 (em token B)
  const p2 = p * (1 + change);
  if (!(p2 > 0)) return null;
  const x0 = L * (p <= pa ? 1 / sq(pa) - hi : p >= pb ? 0 : 1 / sq(p) - hi);
  const y0 = L * (p <= pa ? 0 : p >= pb ? sq(pb) - sq(pa) : sq(p) - sq(pa));
  const hold = x0 * p2 + y0;
  if (!(hold > 0)) return null;
  return (positionValue(L, p2, pa, pb) / hold - 1) * 100;
}

/** Faixas prontas: estreita, larga e total. Para pares de stablecoin os intervalos são bem menores. */
export function presetRange(p: number, kind: "narrow" | "wide" | "full", stable: boolean): [number, number] {
  if (kind === "full") return [0, Infinity];
  const w = kind === "narrow" ? (stable ? 0.002 : 0.05) : stable ? 0.01 : 0.3;
  return [p * (1 - w), p * (1 + w)];
}
