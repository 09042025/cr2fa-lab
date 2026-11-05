import { getUser } from "@/lib/auth";
import { futuresEnabled, getLiquidations } from "@/lib/futures";
import { fail, json } from "@/lib/http";

/** Liquidações de futuros. Grátis: Bitcoin, diário, 30 dias; Premium: Ethereum, por hora e 90 dias. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const pro = user.plan === "pro" || user.role === "admin";
  const sp = new URL(req.url).searchParams;
  const asset = sp.get("a") === "eth" && pro ? "ETH" : "BTC";
  const interval = sp.get("i") === "1hour" && pro ? "1hour" : "daily";
  if (!futuresEnabled()) return json({ pro, enabled: false, asset, interval });
  const [liq, hourly] = await Promise.all([getLiquidations(asset, interval), getLiquidations(asset, "1hour")]);
  const pts = (liq.data ?? []).slice(interval === "daily" ? (pro ? -90 : -30) : -48);
  const sum = (arr: { longUsd: number; shortUsd: number }[]) => ({ l: arr.reduce((a, p) => a + p.longUsd, 0), s: arr.reduce((a, p) => a + p.shortUsd, 0) });
  const s24 = sum((hourly.data ?? []).slice(-24));
  const s7 = sum((interval === "daily" ? pts : []).slice(-7));
  return json({ pro, enabled: true, asset, interval, longs24: s24.l, shorts24: s24.s, total7: interval === "daily" ? s7.l + s7.s : null, pts: pts.map((p) => ({ t: p.t, l: p.longUsd, s: p.shortUsd })) });
}
