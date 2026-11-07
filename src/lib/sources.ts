import { subgraphId } from "./graph";

/**
 * Estrutura das fontes do Pools Position: redes × exchanges.
 * - schema "uni3": subgraph no formato da Uniswap v3 (Uniswap v3, PancakeSwap v3 e forks). Funciona assim que o ID do subgraph for cadastrado.
 * - demais schemas: ainda sem leitor (aparecem como "em breve").
 * Solana (futuro): Orca (API pública de Whirlpools: api.orca.so) e Raydium (API v3: api-v3.raydium.io) leem pools e TVL por API;
 * as posições individuais vêm das contas on-chain (RPC da Solana, ex.: Helius), e exigem uma chave própria.
 */
export interface Network { id: string; label: string; family: "evm" | "solana" }
export interface Exchange { id: string; label: string; schema: "uni3" | "uni4" | "aero" | "ekubo" | "solana"; chains: string[] }

export const NETWORKS: Network[] = [
  { id: "Ethereum", label: "Ethereum", family: "evm" }, { id: "Arbitrum", label: "Arbitrum", family: "evm" }, { id: "Base", label: "Base", family: "evm" },
  { id: "Robinhood", label: "Robinhood", family: "evm" }, { id: "Polygon", label: "Polygon", family: "evm" }, { id: "Optimism", label: "Optimism", family: "evm" },
  { id: "BSC", label: "BNB", family: "evm" }, { id: "Unichain", label: "Unichain", family: "evm" }, { id: "Solana", label: "Solana", family: "solana" },
];
export const EXCHANGES: Exchange[] = [
  { id: "uniswap-v3", label: "Uniswap v3", schema: "uni3", chains: ["Ethereum", "Arbitrum", "Base", "Robinhood", "Polygon", "Optimism", "BSC", "Unichain"] },
  { id: "uniswap-v4", label: "Uniswap v4", schema: "uni4", chains: ["Ethereum", "Arbitrum", "Base", "Polygon", "Optimism", "BSC", "Unichain"] },
  { id: "pancakeswap-v3", label: "PancakeSwap v3", schema: "uni3", chains: ["Ethereum", "Arbitrum", "Base", "BSC"] },
  { id: "aerodrome-cl", label: "Aero", schema: "aero", chains: ["Base"] },
  { id: "aerodrome-legacy", label: "Aerodrome (legacy)", schema: "aero", chains: ["Base"] },
  { id: "ekubo", label: "Ekubo", schema: "ekubo", chains: ["Ethereum"] },
  { id: "orca", label: "Orca", schema: "solana", chains: ["Solana"] },
  { id: "raydium", label: "Raydium", schema: "solana", chains: ["Solana"] },
];
export const netLabel = (id: string) => NETWORKS.find((n) => n.id === id)?.label ?? id;
export const dexLabel = (id: string) => EXCHANGES.find((e) => e.id === id)?.label ?? id;
export const exchangeOf = (id: string) => EXCHANGES.find((e) => e.id === id);

/** Fonte pronta para leitura: exchange existe nessa rede, tem leitor (uni3) e o ID do subgraph está cadastrado. */
export function sourceReady(chain: string, dex: string): boolean {
  const e = exchangeOf(dex);
  return !!e && e.schema === "uni3" && e.chains.includes(chain) && !!subgraphId(chain, dex);
}
export function readySources(): { chain: string; dex: string }[] {
  return EXCHANGES.flatMap((e) => e.chains.map((c) => ({ chain: c, dex: e.id }))).filter((s) => sourceReady(s.chain, s.dex));
}

const NET_SHORT: Record<string, string> = { Ethereum: "ETH", Arbitrum: "ARB", Base: "Base", Robinhood: "HOOD", Polygon: "POL", Optimism: "OP", BSC: "BNB", Unichain: "UNI", Solana: "SOL" };
const DEX_SHORT: Record<string, string> = { "uniswap-v3": "Uni v3", "uniswap-v4": "Uni v4", "pancakeswap-v3": "Cake v3", "aerodrome-cl": "Aero", "aerodrome-legacy": "Aero L", ekubo: "Ekubo", orca: "Orca", raydium: "Raydium" };
export const sourceShort = (chain: string, dex: string) => `${NET_SHORT[chain] ?? chain} · ${DEX_SHORT[dex] ?? dex}`;
