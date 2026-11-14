import { db } from "./db";
import { BLOCKS, rebalance, type BlockKey } from "./protocol";
import { getQuote, type Quote } from "./dividends";
import { evolution, lastMonths, monthlyIncome } from "./portfolio-calc";

interface H { id: number; block: BlockKey; label: string; value_cents: number; source: string; ticker: string | null; qty: number | null; avg_price: number | null }

/** Carteira completa para o app: posições com cotação, blocos, variação em 30 dias, dividendos por mês e evolução. */
export async function buildPortfolioView(userId: number) {
  const holdings = db().prepare("SELECT id, block, label, value_cents, source, ticker, qty, avg_price FROM holdings WHERE user_id = ? ORDER BY block, id").all(userId) as H[];
  const today = new Date().toISOString().slice(0, 10);
  const tracked = holdings.filter((h) => h.ticker && h.qty && h.qty > 0);
  const quotes = new Map<string, Quote | null>();
  await Promise.all([...new Set(tracked.map((h) => h.ticker as string))].map(async (t) => { quotes.set(t, (await getQuote(t)).data); }));
  const priceOf = (h: H) => (h.ticker ? quotes.get(h.ticker)?.price ?? null : null);
  const valueCents = (h: H) => { const px = priceOf(h); return px && h.qty ? Math.round(px * h.qty * 100) : h.value_cents; };

  const current = Object.fromEntries(BLOCKS.map((b) => [b.key, 0])) as Record<BlockKey, number>;
  for (const h of holdings) current[h.block] += valueCents(h);
  const rows = rebalance(current).map((r) => ({ key: r.block.key, name: r.block.name, color: r.block.color, currentCents: r.currentCents, currentPct: r.currentPct, targetCents: r.targetCents, diffCents: r.diffCents }));
  const totalCents = rows.reduce((a, r) => a + r.currentCents, 0);

  // variação em ~30 dias (só dá para saber para posições com cotação)
  let nowT = 0, prevT = 0;
  for (const h of tracked) {
    const q = quotes.get(h.ticker as string);
    if (q?.price && q.close30) { nowT += q.price * (h.qty as number); prevT += q.close30 * (h.qty as number); }
  }
  const change30 = prevT > 0 ? { cents: Math.round((nowT - prevT) * 100), pct: ((nowT - prevT) / prevT) * 100 } : null;

  const income = monthlyIncome(tracked.map((h) => ({ ticker: h.ticker as string, qty: h.qty as number, dividends: quotes.get(h.ticker as string)?.dividends ?? [] })), today).map((m) => ({ month: m.month, total: m.total }));
  const income12 = income.reduce((a, m) => a + m.total, 0);
  const marketValue = tracked.reduce((a, h) => a + valueCents(h) / 100, 0);
  const fixed = holdings.filter((h) => !(h.ticker && h.qty && h.qty > 0)).reduce((a, h) => a + h.value_cents, 0) / 100;
  const evo = tracked.length ? evolution(tracked.map((h) => ({ qty: h.qty as number, monthly: quotes.get(h.ticker as string)?.monthly ?? [] })), fixed, lastMonths(today, 12)).filter((e) => e.ok).map((e) => ({ m: e.m, value: e.value })) : [];
  const invested = tracked.reduce((a, h) => a + (h.avg_price ? h.avg_price * (h.qty as number) : 0), 0);

  return {
    totalCents, rows, change30, income, income12, dyPct: marketValue > 0 ? (income12 / marketValue) * 100 : null,
    evolution: evo, marketValue, invested,
    holdings: holdings.map((h) => {
      const px = priceOf(h);
      return { id: h.id, block: h.block, label: h.label, valueCents: valueCents(h), source: h.source, ticker: h.ticker, qty: h.qty, avgPrice: h.avg_price, price: px, resultPct: px && h.avg_price ? ((px - h.avg_price) / h.avg_price) * 100 : null };
    }),
  };
}
