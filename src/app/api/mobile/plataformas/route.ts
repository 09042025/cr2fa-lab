import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { DEFI_PLATFORMS, DEXES, EXCHANGES, KIND_LABEL, getDexVolumes, getPlatformTvl } from "@/lib/platforms";

/** DEX e plataformas DeFi (seções: defi, dex, corretoras). Aberto a todos os planos, como no site. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const sp = new URL(req.url).searchParams;
  const secao = ["defi", "dex", "corretoras"].includes(sp.get("s") ?? "") ? sp.get("s")! : "defi";
  if (secao === "corretoras") return json({ secao, exchanges: EXCHANGES });
  const tvlRes = await getPlatformTvl();
  const tvl = tvlRes.data ?? {};
  const rede = sp.get("rede") ?? "";
  const q = (sp.get("q") ?? "").trim().toLowerCase().slice(0, 40);
  const vols = secao === "dex" ? (await getDexVolumes(rede || undefined)).data ?? {} : {};
  const chainTotals = new Map<string, number>();
  for (const i of Object.values(tvl)) for (const [c, v] of Object.entries(i.chains)) chainTotals.set(c, (chainTotals.get(c) ?? 0) + v);
  const chains = [...chainTotals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 20);
  const on = (id: string) => (rede ? tvl[id]?.chains[rede] ?? null : tvl[id]?.tvl ?? null);
  let rows = (secao === "dex" ? DEXES : DEFI_PLATFORMS).filter((p) => !q || p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q));
  if (rede) rows = rows.filter((p) => tvl[p.id]?.chains[rede] !== undefined);
  rows = [...rows].sort((a, b) => (on(b.id) ?? -1) - (on(a.id) ?? -1));
  return json({
    secao, chains, offline: tvlRes.data === null,
    platforms: rows.map((p) => ({
      id: p.id, name: p.name, url: p.url, kind: KIND_LABEL[p.kind], note: p.note,
      tvl: on(p.id), change7d: tvl[p.id]?.change7d ?? null,
      chains: tvl[p.id] ? Object.entries(tvl[p.id].chains).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c) : [],
      vol: vols[p.id] ?? null,
    })),
  });
}
