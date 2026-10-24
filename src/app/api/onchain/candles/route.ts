import { getUser } from "@/lib/auth";
import { getBtcOnchain } from "@/lib/onchain";
import { getBitstampDaily } from "@/lib/candles";
import { mergeCandles } from "@/lib/candles-core";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Faça login." }, { status: 401 });

  const [raw, ex] = await Promise.all([getBtcOnchain(), getBitstampDaily()]);
  const closes = raw.data?.series.PriceUSD;
  if (!raw.data || !closes) return Response.json({ error: raw.error || "Dados de preço indisponíveis no momento." }, { status: 503 });
  const candles = mergeCandles(ex.data ?? [], closes, raw.data.start);
  return Response.json(
    { candles, exchangeOk: Boolean(ex.data), exchangeError: ex.data ? null : ex.error ?? "sem dados", updatedAt: ex.fetchedAt ?? raw.fetchedAt },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
