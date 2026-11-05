import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Distribuição de liquidez de um pool Uniswap v3, lida direto da blockchain (nós públicos).
 * Só leitura: nada aqui assina ou envia transação. Se qualquer chamada falhar, devolvemos null e a tela segue sem o gráfico.
 */

const RPC: Record<string, string> = {
  Ethereum: "https://ethereum-rpc.publicnode.com",
  Base: "https://base-rpc.publicnode.com",
  Arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  Polygon: "https://polygon-bor-rpc.publicnode.com",
  Optimism: "https://optimism-rpc.publicnode.com",
  "OP Mainnet": "https://optimism-rpc.publicnode.com",
  BSC: "https://bsc-rpc.publicnode.com",
};
export const TICK_SPACING: Record<number, number> = { 100: 1, 500: 10, 3000: 60, 10000: 200 };
const BINS = 80;

const sel = (sig: string) => bytesToHex(keccak_256(new TextEncoder().encode(sig))).slice(0, 8);
const S = { slot0: sel("slot0()"), liquidity: sel("liquidity()"), token0: sel("token0()"), decimals: sel("decimals()"), bitmap: sel("tickBitmap(int16)"), ticks: sel("ticks(int24)") };

const pad = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0");
/** Inteiro com sinal (complemento de dois) em 256 bits para hexadecimal de 32 bytes. */
export function encInt(n: number): string {
  return (n >= 0 ? BigInt(n) : (1n << 256n) + BigInt(n)).toString(16).padStart(64, "0");
}
/** Lê um inteiro com sinal de `bits` bits na posição `i` (palavra de 32 bytes) do retorno de uma chamada. */
export function decSigned(ret: string, i: number, bits: number): bigint {
  const w = ret.replace(/^0x/, "").slice(i * 64, i * 64 + 64);
  let v = BigInt("0x" + (w || "0"));
  const mod = 1n << BigInt(bits);
  v &= mod - 1n;
  return v >= mod / 2n ? v - mod : v;
}
export const decUnsigned = (ret: string, i: number) => BigInt("0x" + (ret.replace(/^0x/, "").slice(i * 64, i * 64 + 64) || "0"));

export interface TickNet { tick: number; net: number }

/**
 * Liquidez ativa em cada trecho entre ticks inicializados, a partir do tick atual e da liquidez atual.
 * Devolve trechos [tickInicial, tickFinal, liquidez]; o primeiro e o último se estendem ~1 espaçamento além.
 */
export function buildProfile(currentTick: number, liquidity: number, ticks: TickNet[]): { from: number; to: number; l: number }[] {
  const sorted = [...ticks].sort((a, b) => a.tick - b.tick);
  const above = sorted.filter((t) => t.tick > currentTick);
  const below = sorted.filter((t) => t.tick <= currentTick).reverse();
  const out: { from: number; to: number; l: number }[] = [];
  // para cima
  let l = liquidity, from = currentTick;
  for (const t of above) { out.push({ from, to: t.tick, l: Math.max(0, l) }); l += t.net; from = t.tick; }
  out.push({ from, to: from + 1e9, l: Math.max(0, l) });
  // para baixo
  l = liquidity; let to = currentTick;
  for (const t of below) { out.push({ from: t.tick, to, l: Math.max(0, l) }); l -= t.net; to = t.tick; }
  out.push({ from: to - 1e9, to, l: Math.max(0, l) });
  return out.sort((a, b) => a.from - b.from);
}

/** Preço (token1 por token0) de um tick. */
export const tickPrice = (tick: number, dec0: number, dec1: number) => Math.pow(1.0001, tick) * Math.pow(10, dec0 - dec1);

export interface Distribution {
  /** Preço central (o atual do pool) e o intervalo coberto, em escala logarítmica: de center/3 até center*3. */
  center: number; lo: number; hi: number;
  /** Liquidez relativa (0 a 1) em BINS faixas igualmente espaçadas em log entre lo e hi. */
  bins: number[];
  /** Valor, em unidades do token1 do pool, de uma posição de faixa total com a mesma liquidez ATIVA de hoje. */
  activeValueToken1?: number;
  /** true quando o token1 do pool é o primeiro token (A) do par exibido. */
  token1IsA?: boolean;
}

/** Agrupa os trechos de liquidez em BINS faixas de preço (escala logarítmica). `invert` mostra o preço do token1 em token0. */
export function binProfile(profile: { from: number; to: number; l: number }[], currentTick: number, dec0: number, dec1: number, invert: boolean): Distribution {
  const px = (t: number) => { const v = tickPrice(t, dec0, dec1); return invert ? 1 / v : v; };
  const center = px(currentTick);
  const lo = center / 3, hi = center * 3;
  const llo = Math.log(lo), lhi = Math.log(hi);
  const raw = new Array<number>(BINS).fill(0);
  for (let i = 0; i < BINS; i++) {
    const mid = Math.exp(llo + ((i + 0.5) / BINS) * (lhi - llo));
    // tick correspondente a esse preço
    const v = invert ? 1 / mid : mid;
    const tick = Math.log(v / Math.pow(10, dec0 - dec1)) / Math.log(1.0001);
    const seg = profile.find((s) => tick >= s.from && tick < s.to);
    raw[i] = seg ? seg.l : 0;
  }
  const max = Math.max(...raw, 0);
  return { center, lo, hi, bins: raw.map((v) => (max > 0 ? v / max : 0)) };
}

async function rpc(url: string, calls: { to: string; data: string }[]): Promise<(string | null)[]> {
  const out: (string | null)[] = [];
  for (let i = 0; i < calls.length; i += 80) {
    const chunk = calls.slice(i, i + 80);
    const body = chunk.map((c, j) => ({ jsonrpc: "2.0", id: j, method: "eth_call", params: [{ to: c.to, data: "0x" + c.data }, "latest"] }));
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const arr = (await res.json()) as { id: number; result?: string }[];
    const byId = new Map(arr.map((r) => [r.id, r.result ?? null]));
    chunk.forEach((_, j) => out.push(byId.get(j) ?? null));
  }
  return out;
}

/** Lê a liquidez do pool v3 e devolve a distribuição por faixa de preço, na orientação "tokenB por tokenA". */
export async function loadDistribution(chain: string, pool: string, tokenA: string, fee: number): Promise<Distribution | null> {
  const url = RPC[chain];
  const spacing = TICK_SPACING[fee];
  if (!url || !spacing) return null;
  const [s0, liq, t0] = await rpc(url, [{ to: pool, data: S.slot0 }, { to: pool, data: S.liquidity }, { to: pool, data: S.token0 }]);
  if (!s0 || !liq || !t0) return null;
  const currentTick = Number(decSigned(s0, 1, 24));
  const liquidity = Number(decUnsigned(liq, 0));
  const token0 = "0x" + t0.replace(/^0x/, "").slice(-40);
  const invert = token0.toLowerCase() !== tokenA.toLowerCase(); // tokenA não é o token0 do pool: mostrar o preço invertido
  const [d0, d1] = await Promise.all([rpc(url, [{ to: token0, data: S.decimals }]), (async () => {
    const t1 = await rpc(url, [{ to: pool, data: sel("token1()") }]);
    return t1[0] ? rpc(url, [{ to: "0x" + t1[0].replace(/^0x/, "").slice(-40), data: S.decimals }]) : [null];
  })()]);
  if (!d0[0] || !d1[0]) return null;
  const dec0 = Number(decUnsigned(d0[0], 0)), dec1 = Number(decUnsigned(d1[0], 0));
  // palavras do bitmap ao redor do tick atual
  const comp = Math.floor(currentTick / spacing);
  const wordPos = Math.floor(comp / 256);
  const words: number[] = [];
  for (let w = wordPos - 6; w <= wordPos + 6; w++) words.push(w);
  const maps = await rpc(url, words.map((w) => ({ to: pool, data: S.bitmap + encInt(w) })));
  const initialized: number[] = [];
  words.forEach((w, i) => {
    const m = maps[i];
    if (!m) return;
    const v = decUnsigned(m, 0);
    if (v === 0n) return;
    for (let b = 0; b < 256; b++) if ((v >> BigInt(b)) & 1n) initialized.push((w * 256 + b) * spacing);
  });
  if (!initialized.length) return null;
  const infos = await rpc(url, initialized.map((t) => ({ to: pool, data: S.ticks + encInt(t) })));
  const ticks: TickNet[] = [];
  initialized.forEach((t, i) => { const r = infos[i]; if (r) ticks.push({ tick: t, net: Number(decSigned(r, 1, 128)) }); });
  if (!ticks.length) return null;
  const dist = binProfile(buildProfile(currentTick, liquidity, ticks), currentTick, dec0, dec1, invert);
  // liquidez ativa em "valor de faixa total": L × 2√P (em token1 bruto) convertido para unidades do token1
  const sqrtP = Number(decUnsigned(s0, 0)) / 2 ** 96;
  dist.activeValueToken1 = (liquidity * 2 * sqrtP) / Math.pow(10, dec1);
  dist.token1IsA = invert;
  return dist;
}
