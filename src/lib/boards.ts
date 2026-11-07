import { EXCHANGES, NETWORKS, exchangeOf, sourceReady } from "./sources";
import { getBoard, type BoardPosition } from "./toppositions";

export interface MultiBoard {
  positions: BoardPosition[]; pools: number;
  errors: { chain: string; dex: string; error: string }[];
  pending: { chain: string; dex: string }[]; // fonte existe mas ainda não tem leitor/ID cadastrado
  loaded: number;
}

/** Junta o ranking de várias redes e exchanges. Cada fonte falha sozinha, sem derrubar as outras. */
export async function loadMulti(chains: string[], dexes: string[], tokenA = "", tokenB = ""): Promise<MultiBoard> {
  const wanted = chains.flatMap((c) => dexes.filter((d) => exchangeOf(d)?.chains.includes(c)).map((d) => ({ chain: c, dex: d })));
  const ready = wanted.filter((s) => sourceReady(s.chain, s.dex));
  const pending = wanted.filter((s) => !sourceReady(s.chain, s.dex));
  const res = await Promise.allSettled(ready.map((s) => getBoard(s.chain, s.dex, tokenA, tokenB)));
  const out: MultiBoard = { positions: [], pools: 0, errors: [], pending, loaded: 0 };
  res.forEach((r, i) => {
    if (r.status === "fulfilled") { out.positions.push(...r.value.positions); out.pools += r.value.pools; out.loaded++; }
    else out.errors.push({ ...ready[i], error: r.reason instanceof Error ? r.reason.message : "erro" });
  });
  return out;
}

/** Lê "redes" e "dex" da URL (lista separada por vírgulas) e valida contra o cadastro. */
export function parseSelection(redes: string | undefined, dex: string | undefined, defaults: { chains: string[]; dexes: string[] }) {
  const ok = (csv: string | undefined, valid: string[], d: string[]) => { const l = (csv ?? "").split(",").filter((x) => valid.includes(x)); return l.length ? l : d; };
  return { chains: ok(redes, NETWORKS.map((n) => n.id), defaults.chains), dexes: ok(dex, EXCHANGES.map((e) => e.id), defaults.dexes) };
}
