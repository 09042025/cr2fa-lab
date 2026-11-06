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
export const graphEnabled = () => !!process.env.GRAPH_API_KEY;

export async function graphQuery<T>(chain: string, v: GraphVersion, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const key = process.env.GRAPH_API_KEY, id = subgraphId(chain, v);
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
