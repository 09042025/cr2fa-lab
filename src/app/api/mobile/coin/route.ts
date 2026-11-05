import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getCoinDetail, getMarketChart } from "@/lib/market";

const PERIODS = [7, 30, 90, 365];

/** Página de um ativo cripto para o app. Informações detalhadas e períodos longos: só Premium (como no site). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id") ?? "";
  const pro = user.plan === "pro" || user.role === "admin";
  const asked = Number(sp.get("d"));
  const days = pro && PERIODS.includes(asked) ? asked : 30;
  const [detail, chart] = await Promise.all([getCoinDetail(id), getMarketChart(id, days)]);
  const c = detail.data;
  if (!c) return fail("Não foi possível carregar este ativo agora.", 503);
  const prices = chart.data?.prices ?? [];
  const step = Math.max(1, Math.floor(prices.length / 70));
  return json({
    pro, days,
    coin: {
      id: c.id, symbol: c.symbol, name: c.name, image: c.image, rank: c.rank, price: c.price, marketCap: c.marketCap, volume: c.volume, change24h: c.change24h,
      info: pro ? {
        fdv: c.fdv, circulating: c.circulating, total: c.total, max: c.max, ath: c.ath, athDate: c.athDate, atl: c.atl, atlDate: c.atlDate,
        change7d: c.change7d, change30d: c.change30d, change1y: c.change1y, description: c.description, categories: c.categories, contracts: c.contracts,
      } : null,
      homepage: c.homepage, twitter: c.twitter,
    },
    prices: prices.filter((_, i) => i % step === 0).map((r) => r[1]),
  });
}
