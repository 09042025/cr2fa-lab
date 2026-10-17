import { getUser } from "@/lib/auth";
import { getAllPools } from "@/lib/market";
import { csvCell, filterPools } from "@/lib/pools";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Faça login.", { status: 401 });
  if (user.plan !== "pro") return new Response("Recurso do plano Pró.", { status: 403 });

  const url = new URL(req.url);
  const pools = await getAllPools();
  if (!pools.data) return new Response("Dados indisponíveis no momento.", { status: 503 });

  const rows = filterPools(pools.data, {
    tipo: url.searchParams.get("tipo") === "rendimento" ? "rendimento" : "liquidez",
    dex: url.searchParams.get("dex") || undefined,
    vol: url.searchParams.get("vol") || undefined,
    rede: url.searchParams.get("rede") || undefined,
    q: url.searchParams.get("q") || undefined,
    min: url.searchParams.get("min") || undefined,
    stable: url.searchParams.get("stable") || undefined,
    ordem: url.searchParams.get("ordem") || undefined,
  }).slice(0, 2000);

  const header = ["ativo", "faixa_taxa", "protocolo", "rede", "tvl_usd", "volume_24h_usd", "apy", "apy_base", "apy_recompensa", "apy_media_30d", "perda_imperm_7d", "stablecoin"];
  const lines = [header.join(",")].concat(
    rows.map((p) => [p.symbol, p.poolMeta, p.project, p.chain, Math.round(p.tvlUsd), p.volumeUsd1d === null ? "" : Math.round(p.volumeUsd1d), p.apy?.toFixed(2), p.apyBase?.toFixed(2), p.apyReward?.toFixed(2), p.apyMean30d?.toFixed(2), p.il7d?.toFixed(2), p.stablecoin ? "sim" : "nao"].map(csvCell).join(",")),
  );
  return new Response("﻿" + lines.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="pools-cr2fa-lab.csv"' },
  });
}
