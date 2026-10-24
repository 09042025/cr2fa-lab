import { getUser } from "@/lib/auth";
import { getBtcOnchain, getHolderPrices } from "@/lib/onchain";
import { buildBase, computeIndicators, round6, unavailableIds } from "@/lib/onchain-calc";
import { HALVINGS, INDICATORS, epochDay, parseIds } from "@/lib/onchain-defs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Faça login." }, { status: 401 });

  const ids = parseIds(new URL(req.url).searchParams.get("i"), user.plan === "pro" ? INDICATORS.length : undefined);
  const raw = await getBtcOnchain();
  if (!raw.data) return Response.json({ error: raw.error || "Dados indisponíveis no momento." }, { status: 503 });

  const holders = await getHolderPrices();
  const base = buildBase(raw.data, { sth: holders.sth.data, lth: holders.lth.data });
  const computed = computeIndicators(base, ids);
  const series = Object.fromEntries(Object.entries(computed).map(([id, lines]) => [id, lines.map(round6)]));

  return Response.json(
    {
      updatedAt: raw.fetchedAt,
      stale: raw.stale || holders.sth.stale || holders.lth.stale,
      holderError: holders.sth.data && holders.lth.data ? null : holders.sth.error || holders.lth.error || "sem dados",
      start: base.start,
      n: base.n,
      price: round6(base.price),
      series,
      unavailable: unavailableIds(base),
      halvings: HALVINGS.map(epochDay),
    },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
