import { getSetting } from "./settings";
/**
 * Acesso de LEITURA ao The Graph (indexador público) com a chave GRAPH_API_KEY, guardada só no servidor.
 * A chave nunca vai para o navegador nem para o app.
 */

export type GraphVersion = "v3" | "v4";
/** IDs oficiais dos subgraphs da Uniswap. Outras redes entram aqui (ou por variável de ambiente GRAPH_ID_<REDE>_<VERSÃO>) quando confirmadas. */
const IDS: Record<string, Partial<Record<GraphVersion, string>>> = {
  Ethereum: { v3: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV", v4: "DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G" },
  Arbitrum: { v3: "FQ6JYszEKApsBpAmiHesRsd9Ygc6mzmpNRANeVQFYoVX" },
};

export function subgraphId(chain: string, v: GraphVersion): string | null {
  return process.env[`GRAPH_ID_${chain.toUpperCase()}_${v.toUpperCase()}`] ?? IDS[chain]?.[v] ?? null;
}
export const graphChains = (v: GraphVersion = "v3") => ["Ethereum", "Arbitrum", "Base", "Optimism", "Polygon", "BSC", "Avalanche", "Unichain"].filter((c) => subgraphId(c, v));
/** Lê a chave tolerando espaços acidentais no nome ou no valor da variável (comum ao colar no Railway). */
export function graphKey(): string | null {
  const direct = process.env.GRAPH_API_KEY?.trim();
  if (direct) return direct;
  const k = Object.keys(process.env).find((n) => n.trim().toUpperCase() === "GRAPH_API_KEY");
  const fromEnv = (k && process.env[k]?.trim()) || null;
  return fromEnv ?? getSetting("graph_api_key");
}
/** Diagnóstico sem revelar valores: nomes (entre aspas) das variáveis que parecem ser a chave. */
export const graphEnvNames = () => Object.keys(process.env).filter((n) => /graph/i.test(n)).map((n) => JSON.stringify(n));
export const graphEnabled = () => !!graphKey();
/** Diagnóstico só para admin: confirma se outras variáveis conhecidas chegam ao servidor (sem valores). */
export const envProbe = () => `GRAPH=[${graphEnvNames().join(", ")}] total=${Object.keys(process.env).length} RPC_ARBITRUM=${process.env.RPC_ARBITRUM ? "sim" : "não"} APP_NAME=${process.env.APP_NAME ? "sim" : "não"} RAILWAY_SERVICE_NAME=${process.env.RAILWAY_SERVICE_NAME ?? "—"} RAILWAY_DEPLOYMENT_ID=${(process.env.RAILWAY_DEPLOYMENT_ID ?? "—").slice(0, 8)}`;

export async function graphQuery<T>(chain: string, v: GraphVersion, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const key = graphKey(), id = subgraphId(chain, v);
  if (!key) throw new Error("chave do The Graph não configurada no servidor");
  if (!id) throw new Error(`sem banco de dados ${v} para ${chain} ainda`);
  const res = await fetch(`https://gateway.thegraph.com/api/${key}/subgraphs/id/${id}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`The Graph HTTP ${res.status}`);
  const j = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (j.errors?.length || !j.data) throw new Error(j.errors?.[0]?.message?.replace(key, "***") ?? "resposta vazia do The Graph");
  return j.data;
}
