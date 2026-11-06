import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { cached, fetchJson } from "./market";
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

/** Nós que costumam aceitar consulta de eventos. Tentamos em ordem até um responder. */
const LOG_RPC: Record<string, string[]> = {
  Ethereum: ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com", "https://eth.drpc.org", "https://1rpc.io/eth"],
  Base: ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://base.drpc.org", "https://1rpc.io/base"],
  Arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com", "https://arbitrum.drpc.org", "https://1rpc.io/arb", "https://arbitrum-one.public.blastapi.io", "https://arbitrum.llamarpc.com"],
  Polygon: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com", "https://polygon.drpc.org", "https://1rpc.io/matic"],
  Optimism: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io", "https://optimism.drpc.org", "https://1rpc.io/op"],
};

async function batch<R>(url: string, calls: { method: string; params: unknown[] }[]): Promise<R[]> {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { id: number; result?: R; error?: { message: string } }[] | { error?: { message: string } };
  if (!Array.isArray(j)) throw new Error(j.error?.message ?? "resposta inválida");
  const out: R[] = new Array(calls.length);
  for (const r of j) {
    if (r.error || r.result === undefined) throw new Error(r.error?.message ?? "resposta vazia");
    out[r.id] = r.result;
  }
  return out;
}

interface Log { blockNumber: string; data: string; topics: string[] }
const ZERO = "0x" + "0".repeat(64);
const TRANSFER = topic("Transfer(address,address,uint256)");

/** Busca eventos da posição em blocos [from,to]. Inclui a criação (Transfer de 0x0) para sabermos quando parar. */
async function logsRange(url: string, npm: string, id: string, from: number, to: number) {
  const f = "0x" + from.toString(16), t = "0x" + to.toString(16);
  const mk = (topics: (string | null)[]) => ({ method: "eth_getLogs", params: [{ address: npm, fromBlock: f, toBlock: t, topics }] });
  const [inc, dec, col, mint] = await batch<Log[]>(url, [mk([T.inc, id]), mk([T.dec, id]), mk([T.col, id]), mk([TRANSFER, ZERO, null, id])]);
  return { inc, dec, col, minted: mint.length > 0 };
}

/** Lê os eventos de um nó: tenta o intervalo todo; se o nó recusar, anda para trás em blocos menores até achar a criação. */
async function logsFromNode(url: string, npm: string, id: string) {
  const [latestHex] = await batch<string>(url, [{ method: "eth_blockNumber", params: [] }]);
  const latest = Number(BigInt(latestHex));
  try {
    const r = await logsRange(url, npm, id, 0, latest);
    return { inc: r.inc, dec: r.dec, col: r.col };
  } catch {
    /* intervalo grande demais: segue em pedaços */
  }
  let size = 5_000_000;
  const acc = { inc: [] as Log[], dec: [] as Log[], col: [] as Log[] };
  let to = latest, rounds = 0;
  while (to > 0 && rounds++ < 60) {
    const from = Math.max(0, to - size + 1);
    try {
      const r = await logsRange(url, npm, id, from, to);
      acc.inc.push(...r.inc); acc.dec.push(...r.dec); acc.col.push(...r.col);
      if (r.minted) return acc;
      to = from - 1;
    } catch (e) {
      const hint = /limited to (?:a )?([\d,]+)/i.exec(e instanceof Error ? e.message : "");
      const lim = hint ? Number(hint[1].replace(/,/g, "")) : 0;
      if (lim && lim < 20_000) throw new Error(`limite de ${lim} blocos por consulta`);
      if (size <= 20_000) throw e;
      size = Math.max(10_000, Math.floor(size / 4));
    }
  }
  throw new Error("histórico longo demais para este nó");
}

/** Eventos da posição (NFT) na Uniswap: depósitos, retiradas e coletas, com data. Valores em unidades humanas. Lança erro se nenhum nó responder. */
export async function loadEvents(chain: string, tokenId: string, dec0: number, dec1: number): Promise<LpEvent[]> {
  const urls = LOG_RPC[chain], npm = NPM[chain];
  if (!urls || !npm || !/^\d+$/.test(tokenId)) throw new Error("rede não suportada");
  const id = "0x" + BigInt(tokenId).toString(16).padStart(64, "0");
  const errs: string[] = [];
  for (const url of urls) {
    try {
      const l = await logsFromNode(url, npm, id);
      const logs = [...l.inc.map((x) => ({ kind: "inc" as const, ...x })), ...l.dec.map((x) => ({ kind: "dec" as const, ...x })), ...l.col.map((x) => ({ kind: "col" as const, ...x }))];
      const blocks = [...new Set(logs.map((x) => x.blockNumber))].slice(0, 400);
      const ts = new Map<string, number>();
      for (let i = 0; i < blocks.length; i += 50) {
        const chunk = blocks.slice(i, i + 50);
        const res = await batch<{ timestamp: string } | null>(url, chunk.map((b) => ({ method: "eth_getBlockByNumber", params: [b, false] })));
        res.forEach((r, k) => { if (r) ts.set(chunk[k], Number(BigInt(r.timestamp))); });
      }
      const d0 = Math.pow(10, dec0), d1 = Math.pow(10, dec1);
      const out = logs.flatMap((x) => {
        const t = ts.get(x.blockNumber); if (!t) return [];
        return [{ ts: t, kind: x.kind, liq: x.kind === "col" ? 0 : Number(word(x.data, 0)), a0: Number(word(x.data, 1)) / d0, a1: Number(word(x.data, 2)) / d1 } as LpEvent];
      }).sort((a, b) => a.ts - b.ts);
      if (out.some((e) => e.kind === "inc")) return out;
      errs.push(`${new URL(url).hostname}: nenhum depósito encontrado`);
    } catch (e) {
      errs.push(`${new URL(url).hostname}: ${e instanceof Error ? e.message : "erro"}`);
    }
  }
  throw new Error(errs.join(" | ") || "nenhum nó respondeu");
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
