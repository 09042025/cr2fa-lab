/**
 * Histórico e calendário de proventos. Fonte aberta sem chave (Yahoo Finance, endpoint público de gráfico),
 * que traz preço, volume e proventos por data "com/ex". A data de pagamento exata não vem desta fonte.
 */
import { cached, fetchJson } from "./market";

export interface Dividend { date: string; value: number } // data ex (AAAA-MM-DD)
export interface Quote { price: number | null; avgDailyVolume: number | null; dividends: Dividend[] }

interface YahooChart {
  chart?: { result?: {
    meta?: { regularMarketPrice?: number };
    timestamp?: number[];
    indicators?: { quote?: { close?: (number | null)[]; volume?: (number | null)[] }[] };
    events?: { dividends?: Record<string, { amount: number; date: number }> };
  }[] };
}

export function parseYahoo(j: YahooChart): Quote {
  const r = j.chart?.result?.[0];
  if (!r) throw new Error("ativo não encontrado na fonte de proventos");
  const divs = Object.values(r.events?.dividends ?? {})
    .filter((d) => d && Number.isFinite(d.amount) && d.amount > 0)
    .map((d) => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), value: d.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const q = r.indicators?.quote?.[0];
  const ts = r.timestamp ?? [];
  const cut = Date.now() / 1000 - 90 * 86400;
  let sum = 0, n = 0;
  (q?.close ?? []).forEach((c, i) => {
    const v = q?.volume?.[i];
    if ((ts[i] ?? 0) >= cut && c && v) { sum += c * v; n++; }
  });
  const price = r.meta?.regularMarketPrice;
  return { price: typeof price === "number" ? price : null, avgDailyVolume: n ? sum / n : null, dividends: divs };
}

export function getQuote(ticker: string) {
  return cached<Quote>(`yahoo:div:${ticker}:v1`, 6 * 3600, async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA?range=5y&interval=1d&events=div`;
    return parseYahoo(await fetchJson<YahooChart>(url, {}, 20000));
  });
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => ymd(new Date(new Date(`${s}T00:00:00Z`).getTime() + n * 86400000));

export const sumBetween = (d: Dividend[], from: string, to: string) => d.filter((x) => x.date > from && x.date <= to).reduce((s, x) => s + x.value, 0);

export interface CalendarMonth { month: number; label: string; items: { date: string; value: number }[] }

/** Proventos dos últimos 12 meses, agrupados por mês do ano (para ver em que meses o ativo costuma pagar). */
export function monthCalendar(d: Dividend[], today: string): CalendarMonth[] {
  const from = addDays(today, -365);
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const months: CalendarMonth[] = names.map((label, i) => ({ month: i + 1, label, items: [] }));
  for (const x of d) if (x.date > from && x.date <= today) months[Number(x.date.slice(5, 7)) - 1].items.push(x);
  return months;
}

/** Estimativa da próxima data ex: repete o padrão do último ano (mesmo mês seguinte) ou o intervalo mediano. */
export function nextEstimate(d: Dividend[], today: string): { date: string; value: number; basis: string } | null {
  if (d.length < 2) return null;
  const last = d[d.length - 1];
  const recent = d.filter((x) => x.date > addDays(today, -400));
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) gaps.push((new Date(recent[i].date).getTime() - new Date(recent[i - 1].date).getTime()) / 86400000);
  if (!gaps.length) return null;
  gaps.sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)];
  let date = addDays(last.date, Math.round(med));
  while (date <= today) date = addDays(date, Math.round(med));
  return { date, value: last.value, basis: med < 45 ? "pagamento mensal" : med < 120 ? "pagamento trimestral" : "padrão histórico" };
}

export const monthsPaid = (d: Dividend[], today: string) =>
  new Set(d.filter((x) => x.date > addDays(today, -365) && x.date <= today).map((x) => x.date.slice(0, 7))).size;
