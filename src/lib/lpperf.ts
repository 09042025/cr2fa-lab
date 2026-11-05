import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { cached, fetchJson } from "./market";
import { RPC } from "./liquidity";
import { NPM, positionAmounts } from "./lppositions";
import { COIN_CHAIN } from "./pooldetail";

/**
 * Desempenho de uma posição Uniswap v3, calculado só com leitura de eventos públicos da blockchain.
 * Mesma lógica do Revert Finance com referência HOLD: tudo valorizado aos preços de hoje.
 */

export interface LpEvent { ts: number; kind: "inc" | "dec" | "col"; liq: number; a0: number; a1: number }

export interface Perf {
  openedAt: number; ageDays: number;
  invested0: number; invested1: number; investedUsd: number;
  withdrawnUsd: number;
  collected0: number; collected1: number; collectedUsd: number;
  uncollectedUsd: number; totalFeesUsd: number; avgDailyFeesUsd: number;
  pnlUsd: number; roi: number; apr: number; feeApr: number;
  divergenceUsd: number; diff0: number; diff1: number;
}

/** Resumo do desempenho. `now` traz o estado atual da posição (quantidades, taxas a coletar e preços em US$). */
export function summarize(events: LpEvent[], now: { t: number; amount0: number; amount1: number; fees0: number; fees1: number; u0: number; u1: number }): Perf | null {
  const inc = events.filter((e) => e.kind === "inc");
  if (!inc.length) return null;
  const sum = (k: LpEvent["kind"], f: "a0" | "a1") => events.filter((e) => e.kind === k).reduce((a, e) => a + e[f], 0);
  const invested0 = sum("inc", "a0"), invested1 = sum("inc", "a1");
  const w0 = sum("dec", "a0"), w1 = sum("dec", "a1");
  // O evento Collect inclui o que saiu na retirada de liquidez; só o excedente são taxas já coletadas.
  const collected0 = Math.max(0, sum("col", "a0") - w0), collected1 = Math.max(0, sum("col", "a1") - w1);
  const { u0, u1 } = now;
  const investedUsd = invested0 * u0 + invested1 * u1;
  const withdrawnUsd = w0 * u0 + w1 * u1;
  const value = now.amount0 * u0 + now.amount1 * u1;
  const collectedUsd = collected0 * u0 + collected1 * u1;
  const uncollectedUsd = now.fees0 * u0 + now.fees1 * u1;
  const totalFeesUsd = collectedUsd + uncollectedUsd;
  const openedAt = Math.min(...inc.map((e) => e.ts));
  const ageDays = Math.max((now.t - openedAt) / 86400, 1 / 24);
  const divergenceUsd = value + withdrawnUsd - investedUsd;
  const pnlUsd = divergenceUsd + totalFeesUsd;
  const roi = investedUsd > 0 ? pnlUsd / investedUsd : 0;
  return {
    openedAt, ageDays, invested0, invested1, investedUsd, withdrawnUsd, collected0, collected1, collectedUsd, uncollectedUsd, totalFeesUsd,
    avgDailyFeesUsd: totalFeesUsd / ageDays, pnlUsd, roi, apr: roi * (365 / ageDays),
    feeApr: investedUsd > 0 ? (totalFeesUsd / investedUsd) * (365 / ageDays) : 0, divergenceUsd,
    diff0: now.amount0 + w0 - invested0, diff1: now.amount1 + w1 - invested1,
  };
}

export interface SeriesPoint { t: number; value: number; hold: number }

/**
 * Evolução diária: valor da posição (sem taxas) e valor de apenas segurar os mesmos tokens depositados (HOLD).
 * A diferença entre as duas linhas é a perda (ou ganho) de divergência.
 */
export function valueSeries(events: LpEvent[], lo: number, hi: number, dec0: number, dec1: number, p0: [number, number][], p1: [number, number][]): SeriesPoint[] {
  const m1 = new Map(p1.map(([t, v]) => [t, v]));
  const evs = [...events].filter((e) => e.kind !== "col").sort((a, b) => a.ts - b.ts);
  const out: SeriesPoint[] = [];
  for (const [t, u0] of p0) {
    const u1 = m1.get(t);
    if (!u1 || !u0) continue;
    let L = 0, h0 = 0, h1 = 0;
    for (const e of evs) {
      if (e.ts > t) break;
      const sgn = e.kind === "inc" ? 1 : -1;
      L += sgn * e.liq; h0 += sgn * e.a0; h1 += sgn * e.a1;
    }
    if (L <= 0) continue;
    const sqrtP = Math.sqrt((u0 / u1) * Math.pow(10, dec1 - dec0));
    const [a0, a1] = positionAmounts(L, sqrtP, lo, hi, dec0, dec1);
    out.push({ t, value: a0 * u0 + a1 * u1, hold: h0 * u0 + h1 * u1 });
  }
  return out;
}

/* ------------------------------ leitura de eventos ------------------------------ */

const topic = (sig: string) => "0x" + bytesToHex(keccak_256(new TextEncoder().encode(sig)));
const T = {
  inc: topic("IncreaseLiquidity(uint256,uint128,uint256,uint256)"),
  dec: topic("DecreaseLiquidity(uint256,uint128,uint256,uint256)"),
  col: topic("Collect(uint256,address,uint256,uint256)"),
};
const word = (data: string, i: number) => BigInt("0x" + (data.replace(/^0x/, "").slice(i * 64, i * 64 + 64) || "0"));

async function call<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const j = (await res.json()) as { result?: T; error?: { message: string } };
  if (j.error || j.result === undefined) throw new Error(j.error?.message ?? "RPC vazio");
  return j.result;
}

interface Log { blockNumber: string; data: string; topics: string[] }

/** Eventos da posição (NFT) na Uniswap: depósitos, retiradas e coletas, com data. Valores em unidades humanas. */
export async function loadEvents(chain: string, tokenId: string, dec0: number, dec1: number): Promise<LpEvent[] | null> {
  const url = RPC[chain], npm = NPM[chain];
  if (!url || !npm || !/^\d+$/.test(tokenId)) return null;
  const id = "0x" + BigInt(tokenId).toString(16).padStart(64, "0");
  try {
    const logs = (await Promise.all((["inc", "dec", "col"] as const).map(async (kind) => {
      const l = await call<Log[]>(url, "eth_getLogs", [{ address: npm, fromBlock: "0x0", toBlock: "latest", topics: [T[kind], id] }]);
      return l.map((x) => ({ kind, ...x }));
    }))).flat();
    const blocks = [...new Set(logs.map((l) => l.blockNumber))].slice(0, 300);
    const ts = new Map<string, number>();
    for (let i = 0; i < blocks.length; i += 50) {
      const chunk = blocks.slice(i, i + 50);
      const body = chunk.map((b, j) => ({ jsonrpc: "2.0", id: j, method: "eth_getBlockByNumber", params: [b, false] }));
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const arr = (await res.json()) as { id: number; result?: { timestamp: string } }[];
      for (const r of arr) if (r.result) ts.set(chunk[r.id], Number(BigInt(r.result.timestamp)));
    }
    const d0 = Math.pow(10, dec0), d1 = Math.pow(10, dec1);
    return logs.flatMap((l) => {
      const t = ts.get(l.blockNumber); if (!t) return [];
      const col = l.kind === "col";
      return [{ ts: t, kind: l.kind, liq: col ? 0 : Number(word(l.data, 0)), a0: Number(word(l.data, col ? 1 : 1)) / d0, a1: Number(word(l.data, col ? 2 : 2)) / d1 }];
    }).sort((a, b) => a.ts - b.ts);
  } catch {
    return null;
  }
}

/** Preços diários (US$) de um token desde `start` (segundos). */
export async function dailyPrices(chain: string, token: string, start: number, days: number): Promise<[number, number][]> {
  const c = COIN_CHAIN[chain]; if (!c) return [];
  const key = `${c}:${token}`;
  const r = await cached<[number, number][]>(`dprice:${key.toLowerCase()}:${Math.floor(start / 86400)}:${days}`, 3600, async () => {
    const j = await fetchJson<{ coins?: Record<string, { prices?: { timestamp: number; price: number }[] }> }>(`https://coins.llama.fi/chart/${key}?start=${start}&span=${days}&period=1d`, {}, 12000);
    const pts = Object.values(j.coins ?? {})[0]?.prices ?? [];
    return pts.map((p) => [Math.floor(p.timestamp / 86400) * 86400, p.price] as [number, number]);
  });
  return r.data ?? [];
}
