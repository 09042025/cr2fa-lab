import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getCryptoPage, getFearGreed, getGlobalMarket, getMarketChart } from "@/lib/market";

const STABLES = new Set(["USDT", "USDC", "DAI", "USDE", "FDUSD", "USDS", "PYUSD", "TUSD", "USD1", "USDD", "BUIDL", "USDTB", "USDG", "RLUSD"]);
const PERIODS = [7, 30, 90, 365];
const FNG_PT: Record<string, string> = { "Extreme Fear": "Medo extremo", Fear: "Medo", Neutral: "Neutro", Greed: "Ganância", "Extreme Greed": "Ganância extrema" };

/** "Visão de mercado" do site (Cripto), para o app. Altas/baixas e períodos longos: só Premium, como no site. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const pro = user.plan === "pro" || user.role === "admin";
  const asked = Number(new URL(req.url).searchParams.get("d"));
  const days = pro && PERIODS.includes(asked) ? asked : 30;
  const [global, fng, top, chart] = await Promise.all([getGlobalMarket(), getFearGreed(), getCryptoPage(1, undefined, 250), getMarketChart("bitcoin", days)]);
  const list = top.data ?? [];
  const moving = list.filter((c) => c.change24h !== null && c.volumeUsd > 1_000_000);
  const pick = (c: (typeof list)[number]) => ({ id: c.id, symbol: c.symbol, name: c.name, priceUsd: c.priceUsd, change24h: c.change24h, image: c.image ?? null });
  const btc = list.find((c) => c.id === "bitcoin");
  const withData = list.filter((c) => c.id !== "bitcoin" && !STABLES.has(c.symbol)).slice(0, 100).filter((c) => typeof c.change30d === "number");
  const altIndex = btc && typeof btc.change30d === "number" && withData.length >= 20
    ? Math.round((withData.filter((c) => (c.change30d as number) > (btc.change30d as number)).length / withData.length) * 100)
    : null;
  const g = global.data;
  const caps = chart.data ? (chart.data.caps.length > 1 ? chart.data.caps : chart.data.prices) : [];
  const step = Math.max(1, Math.floor(caps.length / 60));
  return json({
    pro, days,
    global: g,
    others: g && g.btcDominance !== null && g.ethDominance !== null ? Math.max(0, 100 - g.btcDominance - g.ethDominance) : null,
    fng: fng.data ? { value: fng.data.value, label: FNG_PT[fng.data.label] || fng.data.label, history: [...fng.data.history].reverse().map((h) => h.value) } : null,
    altIndex,
    cap: caps.filter((_, i) => i % step === 0).map((r) => r[1]),
    gainers: pro ? [...moving].sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 10).map(pick) : null,
    losers: pro ? [...moving].sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0)).slice(0, 10).map(pick) : null,
  });
}
