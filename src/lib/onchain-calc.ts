import { INDICATORS, INDICATOR_BY_ID, epochDay, type BaseKey } from "./onchain-defs";

/**
 * Cálculo dos indicadores on-chain a partir de séries diárias alinhadas.
 * Funções puras, sem rede nem banco, para poder testar.
 */

export type Series = (number | null)[];

/** Séries brutas guardadas em cache, alinhadas ao dia do primeiro preço. */
export interface RawOnchain {
  /** Dia (dias desde 1970) da posição 0. */
  start: number;
  n: number;
  /** Chaves da Coin Metrics: PriceUSD, SplyCur, CapRealUSD, CapMVRVCur, HashRate, DiffMean, AdrActCnt, TxCnt, TxTfrValAdjUSD. */
  series: Record<string, Series>;
  /** Métricas que a fonte não oferece (erro 400/404). */
  missing: string[];
  /** Métricas que falharam por erro passageiro (limite, rede). */
  failed: string[];
}

export interface Base {
  start: number;
  n: number;
  price: Series;
  supply: Series | null;
  /** Valor realizado em US$. */
  rc: Series | null;
  /** Hash rate em EH/s. */
  hash: Series | null;
  /** Dificuldade em trilhões. */
  diff: Series | null;
  addr: Series | null;
  tx: Series | null;
  /** Valor transferido ajustado, US$. */
  tvol: Series | null;
  /** Preço realizado dos detentores de curto (STH) e longo prazo (LTH), em US$. */
  sth: Series | null;
  lth: Series | null;
}

const nulls = (n: number): Series => new Array<number | null>(n).fill(null);
const combine = (a: Series, b: Series, f: (x: number, y: number) => number | null): Series =>
  a.map((x, i) => {
    const y = b[i];
    return x === null || y === null ? null : f(x, y);
  });
const scale = (a: Series, k: number): Series => a.map((x) => (x === null ? null : x * k));

export function sma(a: Series, n: number): Series {
  const out = nulls(a.length);
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v !== null) { sum += v; cnt++; }
    if (i >= n) {
      const o = a[i - n];
      if (o !== null) { sum -= o; cnt--; }
    }
    if (i >= n - 1 && cnt === n) out[i] = sum / n;
  }
  return out;
}

/** Desvio padrão (população) acumulado desde o início, a partir de `minCount` valores. */
export function expandingStd(a: Series, minCount: number): Series {
  const out = nulls(a.length);
  let n = 0;
  let mean = 0;
  let m2 = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v === null) continue;
    n++;
    const d = v - mean;
    mean += d / n;
    m2 += d * (v - mean);
    if (n >= minCount) out[i] = Math.sqrt(m2 / n);
  }
  return out;
}

/** Moedas emitidas por dia: diferença da oferta em circulação. */
export function issuance(supply: Series): Series {
  const out = nulls(supply.length);
  for (let i = 1; i < supply.length; i++) {
    const a = supply[i - 1];
    const b = supply[i];
    if (a !== null && b !== null && b >= a) out[i] = b - a;
  }
  return out;
}

const dayOfGenesis = epochDay("2009-01-03");

/** Preço pela lei de potência (Santostasi): 10^(-17,01593 + 5,84509 × log10(dias desde o gênese)). */
export function powerLaw(day: number): number | null {
  const d = day - dayOfGenesis;
  return d > 0 ? Math.pow(10, -17.01593 + 5.84509 * Math.log10(d)) : null;
}

/** Converte a série de hash rate para EH/s, seja qual for a unidade da fonte (H/s ou TH/s). */
export function hashToEh(a: Series): Series {
  let max = 0;
  for (const v of a) if (v !== null && v > max) max = v;
  const div = max > 1e15 ? 1e18 : 1e6; // H/s -> EH/s ou TH/s -> EH/s
  return scale(a, 1 / div);
}

export type DayValue = [number, number];

export function buildBase(raw: RawOnchain, extra: { sth?: DayValue[] | null; lth?: DayValue[] | null } = {}): Base {
  const s = raw.series;
  const price = s.PriceUSD;
  const supply = s.SplyCur ?? null;
  let rc: Series | null = s.CapRealUSD ?? null;
  if (!rc && s.CapMVRVCur && supply) {
    // valor realizado = valor de mercado / MVRV
    rc = price.map((p, i) => {
      const sp = supply[i];
      const m = s.CapMVRVCur[i];
      return p === null || sp === null || m === null || m <= 0 ? null : (p * sp) / m;
    });
  }
  return {
    start: raw.start,
    n: raw.n,
    price,
    supply,
    rc,
    hash: s.HashRate ? hashToEh(s.HashRate) : null,
    diff: s.DiffMean ? scale(s.DiffMean, 1e-12) : null,
    addr: s.AdrActCnt ?? null,
    tx: s.TxCnt ?? null,
    tvol: s.TxTfrValAdjUSD ?? null,
    sth: extra.sth?.length ? alignSeries(new Map(extra.sth), raw.start, raw.n) : null,
    lth: extra.lth?.length ? alignSeries(new Map(extra.lth), raw.start, raw.n) : null,
  };
}

const days = (b: Base) => Array.from({ length: b.n }, (_, i) => b.start + i);
const marketCap = (b: Base) => combine(b.price, b.supply as Series, (p, s) => p * s);
const issuanceUsd = (b: Base) => combine(issuance(b.supply as Series), b.price, (i, p) => i * p);

type Calc = (b: Base) => Series[];

const CALC: Record<string, Calc> = {
  mvrv: (b) => [combine(marketCap(b), b.rc as Series, (m, r) => (r > 0 ? m / r : null))],
  mvrv_z: (b) => {
    const mc = marketCap(b);
    const sd = expandingStd(mc, 365);
    const rc = b.rc as Series;
    return [mc.map((m, i) => (m === null || rc[i] === null || sd[i] === null || sd[i] === 0 ? null : (m - (rc[i] as number)) / (sd[i] as number)))];
  },
  nupl: (b) => [combine(marketCap(b), b.rc as Series, (m, r) => (m > 0 ? 1 - r / m : null))],
  realized_price: (b) => [combine(b.rc as Series, b.supply as Series, (r, s) => (s > 0 ? r / s : null))],
  realized_cap: (b) => [marketCap(b), (b.rc as Series).slice()],
  thermocap: (b) => {
    const mc = marketCap(b);
    const iss = issuanceUsd(b);
    let cum = 0;
    return [
      mc.map((m, i) => {
        if (iss[i] !== null) cum += iss[i] as number;
        return m === null || i < 90 || cum <= 0 ? null : m / cum;
      }),
    ];
  },
  puell: (b) => {
    const iss = issuanceUsd(b);
    const ma = sma(iss, 365);
    return [combine(iss, ma, (i, m) => (m > 0 && i > 0 ? i / m : null))];
  },
  nvt: (b) => [combine(marketCap(b), sma(b.tvol as Series, 90), (m, v) => (v > 0 ? m / v : null))],
  sth_realized_price: (b) => [(b.sth as Series).slice()],
  lth_realized_price: (b) => [(b.lth as Series).slice()],
  sth_mvrv: (b) => [combine(b.price, b.sth as Series, (p, r) => (r > 0 ? p / r : null))],
  lth_mvrv: (b) => [combine(b.price, b.lth as Series, (p, r) => (r > 0 ? p / r : null))],
  wma200: (b) => [sma(b.price, 1400)],
  dma200: (b) => [sma(b.price, 200)],
  mayer: (b) => [combine(b.price, sma(b.price, 200), (p, m) => (m > 0 ? p / m : null))],
  pi_cycle: (b) => [sma(b.price, 111), scale(sma(b.price, 350), 2)],
  power_law: (b) => [days(b).map(powerLaw)],
  drawdown: (b) => {
    let max = 0;
    return [
      b.price.map((p) => {
        if (p === null) return null;
        if (p > max) max = p;
        return max > 0 ? (p / max - 1) * 100 : null;
      }),
    ];
  },
  hashrate: (b) => [(b.hash as Series).slice()],
  hash_ribbons: (b) => [sma(b.hash as Series, 30), sma(b.hash as Series, 60)],
  difficulty: (b) => [(b.diff as Series).slice()],
  active_addr: (b) => [sma(b.addr as Series, 30)],
  tx_count: (b) => [sma(b.tx as Series, 30)],
};

export function isAvailable(b: Base, id: string): boolean {
  if (!Object.hasOwn(INDICATOR_BY_ID, id) || !Object.hasOwn(CALC, id)) return false;
  const def = INDICATOR_BY_ID[id];
  return def.needs.every((k: BaseKey) => b[k] !== null);
}

export function unavailableIds(b: Base): string[] {
  return INDICATORS.filter((d) => !isAvailable(b, d.id)).map((d) => d.id);
}

/** Calcula só os indicadores pedidos (e disponíveis). Cada indicador devolve uma série por linha. */
export function computeIndicators(b: Base, ids: string[]): Record<string, Series[]> {
  const out: Record<string, Series[]> = {};
  for (const id of ids) if (isAvailable(b, id)) out[id] = CALC[id](b);
  return out;
}

/** Arredonda para 6 algarismos significativos para reduzir o tamanho da resposta. */
export const round6 = (a: Series): Series => a.map((v) => (v === null || !Number.isFinite(v) ? null : Number(v.toPrecision(6))));

/** Alinha pares dia→valor a partir de `start` em `n` posições. */
export function alignSeries(points: Map<number, number>, start: number, n: number): Series {
  const out = nulls(n);
  for (const [day, v] of points) {
    const i = day - start;
    if (i >= 0 && i < n) out[i] = v;
  }
  return out;
}

/**
 * Lê a resposta da API de preço realizado STH/LTH (bitcoin-data.com). O formato é uma lista de objetos com a data
 * (`d`, "AAAA-MM-DD", ou `unixTs`) e um campo numérico com o valor. Aceita também a lista dentro de `data`.
 */
export function parseHolderRows(body: unknown): DayValue[] {
  const list = Array.isArray(body) ? body : Array.isArray((body as { data?: unknown } | null)?.data) ? ((body as { data: unknown[] }).data) : [];
  const out = new Map<number, number>();
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    let day: number | null = null;
    if (typeof r.d === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.d)) day = epochDay(r.d.slice(0, 10));
    else if (Number.isFinite(Number(r.unixTs))) {
      const ts = Number(r.unixTs);
      day = Math.floor((ts > 1e11 ? ts / 1000 : ts) / 86400);
    }
    if (day === null) continue;
    for (const [k, v] of Object.entries(r)) {
      if (k === "d" || k === "unixTs" || v === null || v === "") continue;
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) { out.set(day, n); break; }
    }
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]);
}
