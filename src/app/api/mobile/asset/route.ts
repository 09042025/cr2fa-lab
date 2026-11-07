import { getUser } from "@/lib/auth";
import { chartLinks, cleanTicker, tradingViewSymbol } from "@/lib/charts";
import { fail, json } from "@/lib/http";
import { getAssetDetail } from "@/lib/market";

/** Ação ou FII para o app (?t=TICKER&de=fiis): cotação, gráfico, indicadores e proventos (Premium) e links, igual à página do site. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const sp = new URL(req.url).searchParams;
  const ticker = cleanTicker(sp.get("t") ?? "");
  if (!ticker) return fail("Ativo não encontrado.", 404);
  const isFii = sp.get("de") === "fiis";
  const pro = user.plan === "pro" || user.role === "admin";
  const res = await getAssetDetail(ticker);
  const d = res.data;
  const lower = ticker.toLowerCase();
  const docs = isFii
    ? [
        { label: "Relatórios gerenciais e documentos (Investidor10)", url: `https://investidor10.com.br/fiis/${lower}/` },
        { label: "Funds Explorer", url: `https://www.fundsexplorer.com.br/funds/${lower}` },
        { label: "Status Invest", url: `https://statusinvest.com.br/fundos-imobiliarios/${lower}` },
      ]
    : [
        { label: "Investidor10", url: `https://investidor10.com.br/acoes/${lower}/` },
        { label: "Status Invest", url: `https://statusinvest.com.br/acoes/${lower}` },
        { label: "Resultados e documentos (RI da empresa, pelo Investidor10)", url: `https://investidor10.com.br/acoes/${lower}/` },
      ];
  return json({
    ticker, isFii, pro, failed: d === null, stale: res.stale,
    name: d?.name ?? ticker,
    quote: d ? { price: d.price, changePct: d.changePct, volume: d.volume, marketCap: d.marketCap } : null,
    tvSymbol: tradingViewSymbol("b3", ticker),
    indicators: pro && d ? { dayLow: d.dayLow, dayHigh: d.dayHigh, low52: d.low52, high52: d.high52, pe: d.pe, eps: d.eps } : null,
    dividends: pro && d ? d.dividends : null,
    docs,
    links: chartLinks("b3", ticker, null),
  });
}
