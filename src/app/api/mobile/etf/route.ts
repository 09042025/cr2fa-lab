import { getUser } from "@/lib/auth";
import { getEtfFlows } from "@/lib/etf";
import { fail, json } from "@/lib/http";

/** Fluxo de ETFs de cripto (EUA). Grátis: 10 pregões; Premium: 90 pregões e fluxo por fundo. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const pro = user.plan === "pro" || user.role === "admin";
  const asset = new URL(req.url).searchParams.get("a") === "eth" ? "eth" : "btc";
  const res = await getEtfFlows(asset);
  if (!res.data) return fail("Não foi possível carregar agora.", 503);
  const rows = res.data.rows;
  const sum = (n: number) => rows.slice(-n).reduce((a, r) => a + (r.total ?? 0), 0);
  return json({
    pro, asset, funds: pro ? res.data.funds : null,
    last: rows.length ? { date: rows[rows.length - 1].date, total: rows[rows.length - 1].total } : null,
    sum7: sum(7), sum30: sum(30), cum: rows.reduce((a, r) => a + (r.total ?? 0), 0),
    days: rows.slice(pro ? -90 : -10).map((r) => ({ date: r.date, total: r.total ?? 0 })),
    table: pro ? [...rows].slice(-30).reverse().map((r) => ({ date: r.date, flows: r.flows, total: r.total })) : null,
  });
}
