import { cached, getAllPools } from "./market";
import { earnings } from "./clsim";
import { decSigned, decUnsigned, encInt, rpc, RPC, sel } from "./liquidity";
import { usdPrices } from "./pooldetail";
import { uniswapV3Pool } from "./uniswap";

/**
 * Saúde das pools: lê as posições Uniswap v3 de uma carteira direto da blockchain (nós públicos).
 * SOMENTE LEITURA: só chamadas eth_call. Nada aqui assina, aprova ou envia transação, e a carteira nunca é conectada.
 */

export const LP_CHAINS = ["Ethereum", "Base", "Arbitrum", "Polygon", "Optimism"] as const;
const NPM: Record<string, string> = {
  Ethereum: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", Arbitrum: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  Optimism: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", Polygon: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  Base: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
};
const SLUG: Record<string, string> = { Ethereum: "ethereum", Base: "base", Arbitrum: "arbitrum", Polygon: "polygon", Optimism: "optimism" };
export const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const MAX_PER_CHAIN = 40;
const Q = 1n << 256n;
const mod = (x: bigint) => ((x % Q) + Q) % Q;

/* ------------------------------ matemática (testada) ------------------------------ */

export const tickToPrice = (tick: number, dec0: number, dec1: number) => Math.pow(1.0001, tick) * Math.pow(10, dec0 - dec1);

/** Quantidades (unidades humanas) dos dois tokens de uma posição com liquidez L, entre tickLower e tickUpper, com o pool no sqrtP atual. */
export function positionAmounts(L: number, sqrtP: number, tickLower: number, tickUpper: number, dec0: number, dec1: number): [number, number] {
  const a = Math.pow(1.0001, tickLower / 2), b = Math.pow(1.0001, tickUpper / 2);
  let a0 = 0, a1 = 0;
  if (sqrtP <= a) a0 = L * (1 / a - 1 / b);
  else if (sqrtP >= b) a1 = L * (b - a);
  else { a0 = L * (1 / sqrtP - 1 / b); a1 = L * (sqrtP - a); }
  return [a0 / Math.pow(10, dec0), a1 / Math.pow(10, dec1)];
}

/** Crescimento de taxas "dentro" do intervalo (fórmula do contrato da Uniswap v3, aritmética de 256 bits). */
export function feeGrowthInside(global: bigint, outLower: bigint, outUpper: bigint, tick: number, lower: number, upper: number): bigint {
  const below = tick >= lower ? outLower : mod(global - outLower);
  const above = tick < upper ? outUpper : mod(global - outUpper);
  return mod(global - below - above);
}

/** Taxas a coletar (em unidades brutas do token): o já "tokensOwed" mais o que foi gerado desde a última atualização. */
export function uncollected(liquidity: bigint, inside: bigint, insideLast: bigint, owed: bigint): bigint {
  return ((liquidity * mod(inside - insideLast)) >> 128n) + owed;
}

export type Health = "ok" | "attention" | "out";
/** Saúde: dentro da faixa e longe das bordas = ok; perto de uma borda = atenção; fora da faixa = não rende taxas. */
export function healthOf(tick: number, lower: number, upper: number): { health: Health; pos: number } {
  if (tick < lower || tick >= upper) return { health: "out", pos: tick < lower ? 0 : 1 };
  const pos = (tick - lower) / (upper - lower); // 0 = borda inferior, 1 = superior (em ticks, equivale a escala log do preço)
  return { health: pos < 0.15 || pos > 0.85 ? "attention" : "ok", pos };
}

/* ------------------------------ leitura on-chain ------------------------------ */

const S = {
  balanceOf: sel("balanceOf(address)"), byIndex: sel("tokenOfOwnerByIndex(address,uint256)"), positions: sel("positions(uint256)"),
  slot0: sel("slot0()"), liquidity: sel("liquidity()"), fg0: sel("feeGrowthGlobal0X128()"), fg1: sel("feeGrowthGlobal1X128()"),
  ticks: sel("ticks(int24)"), decimals: sel("decimals()"), symbol: sel("symbol()"),
};
const w = (n: bigint | number) => BigInt(n).toString(16).padStart(64, "0");
const addrWord = (a: string) => a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const lastAddr = (ret: string, i: number) => "0x" + ret.replace(/^0x/, "").slice(i * 64 + 24, i * 64 + 64);

function decString(ret: string | null): string {
  if (!ret) return "?";
  const h = ret.replace(/^0x/, "");
  try {
    if (h.length === 64) return Buffer.from(h, "hex").toString("utf8").replace(/\0/g, "").trim() || "?"; // bytes32
    const len = Number(BigInt("0x" + h.slice(64, 128)));
    return Buffer.from(h.slice(128, 128 + len * 2), "hex").toString("utf8").slice(0, 20) || "?";
  } catch { return "?"; }
}

export interface LpPosition {
  chain: string; tokenId: string; pair: string; symbol0: string; symbol1: string; fee: number;
  lower: number; upper: number; price: number; priceLower: number; priceUpper: number;
  health: Health; pos: number;
  amount0: number; amount1: number; valueUsd: number | null;
  fees0: number; fees1: number; feesUsd: number | null;
  poolTvlUsd: number | null; poolApr: number | null; estDayUsd: number | null; estApr: number | null;
  link: string;
}
export interface LpResult { address: string; chains: { chain: string; positions: LpPosition[]; error?: string }[]; fetchedAt: number }

async function loadChain(chain: string, owner: string): Promise<LpPosition[]> {
  const url = RPC[chain], npm = NPM[chain];
  const [bal] = await rpc(url, [{ to: npm, data: S.balanceOf + addrWord(owner) }]);
  const n = Math.min(Number(bal ? decUnsigned(bal, 0) : 0n), MAX_PER_CHAIN);
  if (!n) return [];
  const ids = await rpc(url, Array.from({ length: n }, (_, i) => ({ to: npm, data: S.byIndex + addrWord(owner) + w(i) })));
  const tokenIds = ids.filter((x): x is string => !!x).map((x) => decUnsigned(x, 0));
  const infos = await rpc(url, tokenIds.map((id) => ({ to: npm, data: S.positions + w(id) })));
  type Raw = { id: bigint; t0: string; t1: string; fee: number; lo: number; hi: number; L: bigint; in0: bigint; in1: bigint; ow0: bigint; ow1: bigint; pool: string };
  const raws: Raw[] = [];
  tokenIds.forEach((id, i) => {
    const r = infos[i]; if (!r) return;
    const L = decUnsigned(r, 7);
    if (L === 0n && decUnsigned(r, 10) === 0n && decUnsigned(r, 11) === 0n) return; // posição encerrada e sem taxas
    const t0 = lastAddr(r, 2), t1 = lastAddr(r, 3), fee = Number(decUnsigned(r, 4));
    const pool = uniswapV3Pool(chain, t0, t1, fee);
    if (!pool) return;
    raws.push({ id, t0, t1, fee, lo: Number(decSigned(r, 5, 24)), hi: Number(decSigned(r, 6, 24)), L, in0: decUnsigned(r, 8), in1: decUnsigned(r, 9), ow0: decUnsigned(r, 10), ow1: decUnsigned(r, 11), pool });
  });
  if (!raws.length) return [];
  const pools = [...new Set(raws.map((r) => r.pool))];
  const poolCalls = pools.flatMap((p) => [S.slot0, S.liquidity, S.fg0, S.fg1].map((d) => ({ to: p, data: d })));
  const pr = await rpc(url, poolCalls);
  const poolState = new Map(pools.map((p, i) => {
    const [s0, liq, g0, g1] = pr.slice(i * 4, i * 4 + 4);
    return [p, s0 && g0 && g1 ? { sqrtP: Number(decUnsigned(s0, 0)) / 2 ** 96, tick: Number(decSigned(s0, 1, 24)), liq: liq ? Number(decUnsigned(liq, 0)) : 0, g0: decUnsigned(g0, 0), g1: decUnsigned(g1, 0) } : null];
  }));
  const tickKeys = [...new Set(raws.flatMap((r) => [`${r.pool}:${r.lo}`, `${r.pool}:${r.hi}`]))];
  const tr = await rpc(url, tickKeys.map((k) => { const [p, t] = k.split(":"); return { to: p, data: S.ticks + encInt(Number(t)) }; }));
  const tickOut = new Map(tickKeys.map((k, i) => [k, tr[i] ? [decUnsigned(tr[i]!, 2), decUnsigned(tr[i]!, 3)] as [bigint, bigint] : null]));
  const tokens = [...new Set(raws.flatMap((r) => [r.t0.toLowerCase(), r.t1.toLowerCase()]))];
  const tinfo = await rpc(url, tokens.flatMap((t) => [{ to: t, data: S.decimals }, { to: t, data: S.symbol }]));
  const meta = new Map(tokens.map((t, i) => [t, { dec: tinfo[i * 2] ? Number(decUnsigned(tinfo[i * 2]!, 0)) : 18, sym: decString(tinfo[i * 2 + 1]) }]));
  const prices = await usdPrices(chain, tokens);
  const priceOf = (t: string) => prices[t] ?? prices[Object.keys(prices).find((k) => k.toLowerCase() === t.toLowerCase()) ?? ""] ?? null;
  const all = (await getAllPools()).data ?? [];
  const out: LpPosition[] = [];
  for (const r of raws) {
    const st = poolState.get(r.pool); const lo = tickOut.get(`${r.pool}:${r.lo}`), hi = tickOut.get(`${r.pool}:${r.hi}`);
    if (!st) continue;
    const m0 = meta.get(r.t0.toLowerCase())!, m1 = meta.get(r.t1.toLowerCase())!;
    const L = Number(r.L);
    const [a0, a1] = positionAmounts(L, st.sqrtP, r.lo, r.hi, m0.dec, m1.dec);
    const u0 = priceOf(r.t0), u1 = priceOf(r.t1);
    let f0 = Number(r.ow0), f1 = Number(r.ow1);
    if (lo && hi) {
      f0 = Number(uncollected(r.L, feeGrowthInside(st.g0, lo[0], hi[0], st.tick, r.lo, r.hi), r.in0, r.ow0));
      f1 = Number(uncollected(r.L, feeGrowthInside(st.g1, lo[1], hi[1], st.tick, r.lo, r.hi), r.in1, r.ow1));
    }
    f0 /= Math.pow(10, m0.dec); f1 /= Math.pow(10, m1.dec);
    const value = u0 !== null && u1 !== null ? a0 * u0 + a1 * u1 : null;
    const feesUsd = u0 !== null && u1 !== null ? f0 * u0 + f1 * u1 : null;
    const price = tickToPrice(st.tick, m0.dec, m1.dec);
    const h = healthOf(st.tick, r.lo, r.hi);
    // dados do pool no DefiLlama (volume e TVL) para estimar o rendimento da faixa
    const lp = all.find((p) => p.dex && p.project === "uniswap-v3" && p.chain === chain && p.tokens.length === 2 && p.tokens.some((t) => t.toLowerCase() === r.t0.toLowerCase()) && p.tokens.some((t) => t.toLowerCase() === r.t1.toLowerCase()) && p.poolMeta === `${r.fee / 10000}%`);
    let estDay: number | null = null, estApr: number | null = null;
    if (lp && value && lp.volumeUsd1d !== null && h.health !== "out") {
      const fees24h = lp.volumeUsd1d * (r.fee / 1_000_000);
      const activeValue = u1 !== null && st.liq ? (st.liq * 2 * st.sqrtP) / Math.pow(10, m1.dec) * u1 : lp.tvlUsd;
      const e = earnings(value, price, tickToPrice(r.lo, m0.dec, m1.dec), tickToPrice(r.hi, m0.dec, m1.dec), fees24h, activeValue);
      estDay = e.day; estApr = e.apr;
    }
    out.push({
      chain, tokenId: r.id.toString(), pair: `${m0.sym}/${m1.sym}`, symbol0: m0.sym, symbol1: m1.sym, fee: r.fee, lower: r.lo, upper: r.hi,
      price, priceLower: tickToPrice(r.lo, m0.dec, m1.dec), priceUpper: tickToPrice(r.hi, m0.dec, m1.dec), health: h.health, pos: h.pos,
      amount0: a0, amount1: a1, valueUsd: value, fees0: f0, fees1: f1, feesUsd,
      poolTvlUsd: lp?.tvlUsd ?? null, poolApr: lp?.apy ?? null, estDayUsd: estDay, estApr,
      link: `https://app.uniswap.org/positions/v3/${SLUG[chain]}/${r.id.toString()}`,
    });
  }
  return out.sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
}

/** Consulta as posições do endereço em todas as redes suportadas. Cada rede falha sozinha, sem derrubar as outras. */
export async function getLpPositions(address: string): Promise<LpResult> {
  const addr = address.toLowerCase();
  const chains = await Promise.all(LP_CHAINS.map(async (chain) => {
    const r = await cached<LpPosition[]>(`lp:${chain}:${addr}`, 120, () => loadChain(chain, addr));
    return { chain, positions: r.data ?? [], error: r.data === null ? "Rede indisponível agora." : undefined };
  }));
  return { address, chains, fetchedAt: Math.floor(Date.now() / 1000) };
}
