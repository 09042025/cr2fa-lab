import { cached, fetchJson } from "./market";

/**
 * DEX e plataformas DeFi: lista curada (links oficiais escritos à mão, nunca vindos da rede) +
 * TVL, redes e volumes do DefiLlama (gratuito). Nenhum dado é inventado: sem resposta da fonte, aparece "—".
 */

export type PlatformKind = "emprestimo" | "rendimento" | "staking" | "derivativos" | "stablecoin" | "rwa" | "dex" | "agregador";

export const KIND_LABEL: Record<PlatformKind, string> = {
  emprestimo: "Empréstimo",
  rendimento: "Rendimento",
  staking: "Staking líquido",
  derivativos: "Derivativos",
  stablecoin: "Stablecoins",
  rwa: "Ativos do mundo real",
  dex: "DEX",
  agregador: "Agregador",
};

export interface Platform {
  id: string;
  name: string;
  /** Site oficial. */
  url: string;
  kind: PlatformKind;
  /** Reconhece o(s) protocolo(s) no DefiLlama pelo slug (versões e módulos do mesmo projeto são somados). */
  match: RegExp;
  note: string;
}

const P = (id: string, name: string, url: string, kind: PlatformKind, match: RegExp, note: string): Platform => ({ id, name, url, kind, match, note });

export const DEFI_PLATFORMS: Platform[] = [
  P("aave", "Aave", "https://aave.com", "emprestimo", /^aave(-|$)/, "Maior mercado de empréstimo: deposite para render ou use como garantia para tomar emprestado."),
  P("kamino", "Kamino", "https://kamino.finance", "emprestimo", /^kamino(-|$)/, "Empréstimo e liquidez automatizada na Solana."),
  P("fluid", "Fluid", "https://fluid.io", "emprestimo", /^fluid(-|$)/, "Empréstimo e DEX integrados (inclui o Fluid DEX), da equipe da Instadapp."),
  P("morpho", "Morpho", "https://morpho.org", "emprestimo", /^morpho(-|$)/, "Mercados de empréstimo e cofres de rendimento."),
  P("spark", "Spark", "https://spark.fi", "emprestimo", /^spark(-|$)/, "Empréstimo ligado ao ecossistema Sky (antigo MakerDAO)."),
  P("compound", "Compound", "https://compound.finance", "emprestimo", /^compound(-|$)/, "Um dos pioneiros do empréstimo descentralizado."),
  P("euler", "Euler", "https://www.euler.finance", "emprestimo", /^euler(-|$)/, "Mercados de empréstimo modulares."),
  P("marginfi", "marginfi", "https://www.marginfi.com", "emprestimo", /^marginfi(-|$)/, "Empréstimo na Solana."),
  P("sky", "Sky (MakerDAO)", "https://sky.money", "stablecoin", /^(sky|maker|makerdao)(-|$)/, "Emissora das stablecoins DAI e USDS."),
  P("ethena", "Ethena", "https://ethena.fi", "stablecoin", /^ethena(-|$)/, "Dólar sintético (USDe) e rendimento sUSDe."),
  P("lido", "Lido", "https://lido.fi", "staking", /^lido(-|$)/, "Maior staking líquido de ETH (stETH)."),
  P("rocketpool", "Rocket Pool", "https://rocketpool.net", "staking", /^rocket-?pool(-|$)/, "Staking de ETH descentralizado (rETH)."),
  P("eigenlayer", "EigenLayer", "https://www.eigenlayer.xyz", "staking", /^eigenlayer(-|$)/, "Restaking: reutiliza ETH em staking para proteger outras redes."),
  P("jito", "Jito", "https://www.jito.network", "staking", /^jito(-|$)/, "Staking líquido na Solana (JitoSOL)."),
  P("marinade", "Marinade", "https://marinade.finance", "staking", /^marinade(-|$)/, "Staking líquido na Solana (mSOL)."),
  P("pendle", "Pendle", "https://www.pendle.finance", "rendimento", /^pendle(-|$)/, "Negocia rendimento futuro: taxa fixa e variável."),
  P("yearn", "Yearn", "https://yearn.fi", "rendimento", /^yearn(-|$)/, "Cofres que buscam o melhor rendimento automaticamente."),
  P("beefy", "Beefy", "https://beefy.com", "rendimento", /^beefy(-|$)/, "Cofres com reinvestimento automático em várias redes."),
  P("convex", "Convex", "https://www.convexfinance.com", "rendimento", /^convex(-|$)/, "Potencializa recompensas da Curve."),
  P("maple", "Maple", "https://maple.finance", "rendimento", /^maple(-|$)/, "Crédito institucional on-chain."),
  P("ondo", "Ondo", "https://ondo.finance", "rwa", /^ondo(-|$)/, "Títulos do Tesouro americano tokenizados."),
  P("hyperliquid", "Hyperliquid", "https://hyperliquid.xyz", "derivativos", /^hyperliquid(-|$)/, "Negociação de futuros perpétuos on-chain."),
  P("dydx", "dYdX", "https://dydx.exchange", "derivativos", /^dydx(-|$)/, "Futuros perpétuos descentralizados."),
  P("gmx", "GMX", "https://gmx.io", "derivativos", /^gmx(-|$)/, "Futuros perpétuos e liquidez em Arbitrum e Avalanche."),
];

export const DEXES: Platform[] = [
  P("uniswap", "Uniswap", "https://app.uniswap.org", "dex", /^uniswap(-|$)/, "A maior DEX do mundo, em dezenas de redes."),
  P("pancakeswap", "PancakeSwap", "https://pancakeswap.finance", "dex", /^pancakeswap(-|$)/, "Principal DEX da BNB Chain."),
  P("curve", "Curve", "https://curve.finance", "dex", /^curve(-|$)/, "Especializada em trocas entre stablecoins e ativos parecidos."),
  P("aerodrome", "Aerodrome", "https://aerodrome.finance", "dex", /^aerodrome(-|$)/, "Principal DEX da rede Base."),
  P("velodrome", "Velodrome", "https://velodrome.finance", "dex", /^velodrome(-|$)/, "Principal DEX da Optimism."),
  P("raydium", "Raydium", "https://raydium.io", "dex", /^raydium(-|$)/, "DEX da Solana."),
  P("orca", "Orca", "https://www.orca.so", "dex", /^orca(-|$)/, "DEX da Solana com liquidez concentrada."),
  P("meteora", "Meteora", "https://meteora.ag", "dex", /^meteora(-|$)/, "Liquidez dinâmica na Solana."),
  P("sushi", "SushiSwap", "https://www.sushi.com", "dex", /^sushi(swap)?(-|$)/, "DEX multi-redes."),
  P("balancer", "Balancer", "https://balancer.fi", "dex", /^balancer(-|$)/, "Pools com mais de dois ativos."),
  P("camelot", "Camelot", "https://app.camelot.exchange", "dex", /^camelot(-|$)/, "DEX nativa da Arbitrum."),
  P("lfj", "LFJ (Trader Joe)", "https://lfj.gg", "dex", /^(lfj|trader-?joe)(-|$)/, "DEX da Avalanche e outras redes."),
  P("cetus", "Cetus", "https://www.cetus.zone", "dex", /^cetus(-|$)/, "Principal DEX das redes Sui e Aptos."),
  P("maverick", "Maverick", "https://www.mav.xyz", "dex", /^maverick(-|$)/, "Liquidez dinâmica."),
  P("thena", "Thena", "https://www.thena.fi", "dex", /^thena(-|$)/, "DEX da BNB Chain."),
  P("jupiter", "Jupiter", "https://jup.ag", "dex", /^jupiter(-|$)/, "Maior DEX e agregador da Solana: melhor preço entre várias corretoras, com futuros e staking."),
  P("1inch", "1inch", "https://1inch.io", "dex", /^1inch(-|$)/, "DEX agregadora: busca o melhor preço entre várias DEX."),
  P("cowswap", "CoW Swap", "https://cow.fi", "dex", /^cow(-|swap|$)/, "DEX com trocas protegidas contra MEV."),
  P("kyber", "KyberSwap", "https://kyberswap.com", "dex", /^kyber(-|$)/, "Agregador e DEX multi-redes."),
];

export interface Exchange { name: string; url: string; origin: "Brasil" | "Global"; note: string }
const X = (name: string, url: string, origin: Exchange["origin"], note: string): Exchange => ({ name, url, origin, note });
export const EXCHANGES: Exchange[] = [
  X("Mercado Bitcoin", "https://www.mercadobitcoin.com.br", "Brasil", "Uma das mais antigas do país, opera em reais."),
  X("Foxbit", "https://foxbit.com.br", "Brasil", "Corretora brasileira, depósito por Pix."),
  X("NovaDAX", "https://www.novadax.com.br", "Brasil", "Corretora brasileira com Pix."),
  X("Bitso", "https://bitso.com/br", "Brasil", "Corretora com operação no Brasil e no México."),
  X("Ripio", "https://www.ripio.com", "Brasil", "Compra e venda em reais."),
  X("BitPreço", "https://bitpreco.com", "Brasil", "Corretora brasileira."),
  X("Binance", "https://www.binance.com", "Global", "Maior do mundo em volume. Opera em reais por Pix."),
  X("Coinbase", "https://www.coinbase.com", "Global", "Americana, listada em bolsa."),
  X("Kraken", "https://www.kraken.com", "Global", "Americana, uma das mais antigas."),
  X("OKX", "https://www.okx.com", "Global", "Grande corretora global, com carteira própria."),
  X("Bybit", "https://www.bybit.com", "Global", "Forte em derivativos."),
  X("Bitget", "https://www.bitget.com", "Global", "Spot, futuros e copy trading."),
  X("KuCoin", "https://www.kucoin.com", "Global", "Grande variedade de moedas."),
  X("Gate", "https://www.gate.io", "Global", "Grande variedade de moedas."),
  X("Crypto.com", "https://crypto.com", "Global", "Corretora e cartão."),
  X("Gemini", "https://www.gemini.com", "Global", "Americana, regulada em Nova York."),
  X("Bitstamp", "https://www.bitstamp.net", "Global", "Europeia, das mais antigas."),
  X("Bitfinex", "https://www.bitfinex.com", "Global", "Corretora global."),
  X("MEXC", "https://www.mexc.com", "Global", "Grande variedade de moedas novas."),
  X("HTX", "https://www.htx.com", "Global", "Corretora global (antiga Huobi)."),
];

/* ============================ Dados do DefiLlama ============================ */

export interface TvlInfo {
  tvl: number;
  /** Variação do TVL em 7 dias (%), média ponderada quando o projeto tem várias versões. */
  change7d: number | null;
  /** TVL por rede (US$). */
  chains: Record<string, number>;
}
export interface VolInfo { v24h: number | null; v7d: number | null; v30d: number | null; v1y: number | null }

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const norm = (s: unknown) => (typeof s === "string" ? s.toLowerCase().trim().replace(/[\s_.]+/g, "-") : "");

interface LlamaProtocol { name?: string; slug?: string; tvl?: number | null; change_7d?: number | null; chainTvls?: Record<string, unknown>; chains?: string[] }

/** Soma as versões de cada projeto (ex.: Aave v2 + v3) e o TVL por rede. Só considera chaves que são nomes de rede. */
export function aggregateTvl(raw: LlamaProtocol[], platforms: Platform[]): Record<string, TvlInfo> {
  const out: Record<string, TvlInfo> = {};
  for (const pl of platforms) {
    let tvl = 0, wSum = 0, wChange = 0, any = false;
    const chains: Record<string, number> = {};
    for (const p of raw) {
      const slug = norm(p.slug ?? p.name);
      if (!slug || !pl.match.test(slug)) continue;
      const t = num(p.tvl);
      if (t === null || t <= 0) continue;
      any = true;
      tvl += t;
      const c7 = num(p.change_7d);
      if (c7 !== null) { wSum += t; wChange += t * c7; }
      for (const ch of p.chains ?? []) {
        const v = num(p.chainTvls?.[ch]);
        if (v !== null && v > 0) chains[ch] = (chains[ch] ?? 0) + v;
      }
    }
    if (any) out[pl.id] = { tvl, change7d: wSum > 0 ? wChange / wSum : null, chains };
  }
  return out;
}

interface LlamaDex { name?: string; displayName?: string; slug?: string; module?: string; total24h?: number | null; total7d?: number | null; total30d?: number | null; total1y?: number | null; childProtocols?: unknown[]; parentProtocol?: string | null }

/** Volumes por DEX. Se a fonte entrega o projeto já somado (com "childProtocols"), usa só ele, para não contar em dobro. */
export function aggregateVolumes(raw: LlamaDex[], platforms: Platform[]): Record<string, VolInfo> {
  const out: Record<string, VolInfo> = {};
  for (const pl of platforms) {
    const hits = raw.filter((p) => [p.slug, p.module, p.name, p.displayName].some((n) => { const s = norm(n); return s !== "" && pl.match.test(s); }));
    if (!hits.length) continue;
    const parents = hits.filter((h) => Array.isArray(h.childProtocols) && h.childProtocols.length > 0);
    const use = parents.length ? parents : hits;
    const sum = (k: "total24h" | "total7d" | "total30d" | "total1y") => {
      let t = 0, any = false;
      for (const h of use) { const v = num(h[k]); if (v !== null) { t += v; any = true; } }
      return any ? t : null;
    };
    out[pl.id] = { v24h: sum("total24h"), v7d: sum("total7d"), v30d: sum("total30d"), v1y: sum("total1y") };
  }
  return out;
}

const ALL = [...DEFI_PLATFORMS, ...DEXES];

export function getPlatformTvl() {
  return cached<Record<string, TvlInfo>>("platforms:tvl:v1", 30 * 60, async () => {
    const raw = await fetchJson<LlamaProtocol[]>("https://api.llama.fi/protocols", {}, 40000);
    if (!Array.isArray(raw)) throw new Error("Resposta inesperada do DefiLlama");
    const out = aggregateTvl(raw, ALL);
    if (!Object.keys(out).length) throw new Error("DefiLlama sem dados dos protocolos");
    return out;
  });
}

/** Volume das DEX. Com `chain`, só o volume naquela rede (a rede precisa estar na lista de redes conhecidas). */
export function getDexVolumes(chain?: string) {
  const key = chain ? `platforms:dexvol:v2:${chain.toLowerCase()}` : "platforms:dexvol:v2:all";
  return cached<Record<string, VolInfo>>(key, 30 * 60, async () => {
    const path = chain ? `/${encodeURIComponent(chain)}` : "";
    const raw = await fetchJson<{ protocols?: LlamaDex[] }>(`https://api.llama.fi/overview/dexs${path}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`, {}, 40000);
    if (!raw || !Array.isArray(raw.protocols)) throw new Error("Resposta inesperada do DefiLlama");
    const out = aggregateVolumes(raw.protocols, DEXES);
    // Agregadoras (1inch, CoW etc.) podem estar numa lista separada do DefiLlama: completa só o que faltou.
    if (DEXES.some((d) => !out[d.id])) {
      try {
        const agg = await fetchJson<{ protocols?: LlamaDex[] }>(`https://api.llama.fi/overview/aggregators${path}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`, {}, 40000);
        if (agg && Array.isArray(agg.protocols)) {
          const extra = aggregateVolumes(agg.protocols, DEXES.filter((d) => !out[d.id]));
          Object.assign(out, extra);
        }
      } catch { /* sem a lista de agregadoras, segue só com as DEX */ }
    }
    return out;
  });
}
