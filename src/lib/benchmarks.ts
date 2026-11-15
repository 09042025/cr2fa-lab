import { cached, fetchJson } from "@/lib/market";

/** Ponto mensal (fim do mês) com o índice acumulado de cada referência, todos na base 100 no primeiro mês da série. */
export interface BenchPoint { ts: number; cdi: number; ipca: number; ibov: number | null }
export interface Bench { points: BenchPoint[]; updatedAt: string }

interface Sgs { data: string; valor: string }
const parseBr = (d: string) => { const [dd, mm, yy] = d.split("/").map(Number); return Date.UTC(yy, mm - 1, dd); };
const ym = (ts: number) => { const d = new Date(ts); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };

/**
 * Junta CDI diário (% ao dia), IPCA mensal (% no mês) e fechamentos do Ibovespa em pontos de fim de mês.
 * Função pura, para poder testar sem rede.
 */
export function buildMonthly(cdiDaily: Sgs[], ipcaMonthly: Sgs[], ibov: { ts: number; close: number }[]): BenchPoint[] {
  const cdi = new Map<number, number>(); let idx = 100;
  for (const r of cdiDaily) { const v = Number(r.valor.replace(",", ".")); if (!Number.isFinite(v)) continue; idx *= 1 + v / 100; cdi.set(ym(parseBr(r.data)), idx); }
  const ipca = new Map<number, number>(); let ix = 100;
  for (const r of ipcaMonthly) { const v = Number(r.valor.replace(",", ".")); if (!Number.isFinite(v)) continue; ix *= 1 + v / 100; ipca.set(ym(parseBr(r.data)), ix); }
  const ib = new Map<number, number>(); for (const p of ibov) if (p.close > 0) ib.set(ym(p.ts), p.close);
  const months = [...cdi.keys()].filter((m) => ipca.has(m)).sort((a, b) => a - b);
  if (months.length < 2) return [];
  const baseM = months.find((m) => ib.has(m));
  const base = baseM === undefined ? null : ib.get(baseM)!;
  return months.map((m) => ({ ts: Date.UTC(Math.floor(m / 12), m % 12 + 1, 0), cdi: cdi.get(m)!, ipca: ipca.get(m)!, ibov: base && ib.has(m) && m >= baseM! ? (ib.get(m)! / base) * 100 : null }));
}

const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

/** CDI (SGS 12), IPCA (SGS 433) e Ibovespa (^BVSP) dos últimos 5 anos. Fontes: Banco Central e Yahoo Finance. */
export function getBenchmarks() {
  return cached<Bench>("bench:rf:v1", 6 * 3600, async () => {
    const end = new Date(); const start = new Date(Date.UTC(end.getUTCFullYear() - 5, end.getUTCMonth(), 1));
    const q = `formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;
    const [cdi, ipca, ib] = await Promise.all([
      fetchJson<Sgs[]>(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?${q}`, {}, 25000),
      fetchJson<Sgs[]>(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?${q}`, {}, 25000),
      fetchJson<{ chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } }>("https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=5y&interval=1mo", {}, 20000).catch(() => null),
    ]);
    const r = ib?.chart?.result?.[0]; const closes = r?.indicators?.quote?.[0]?.close ?? [];
    const ibov = (r?.timestamp ?? []).map((t, i) => ({ ts: t * 1000, close: closes[i] ?? 0 }));
    const points = buildMonthly(cdi, ipca, ibov);
    if (points.length < 2) throw new Error("Séries do Banco Central indisponíveis");
    return { points, updatedAt: new Date().toISOString() };
  });
}
