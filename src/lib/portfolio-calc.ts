/** Cálculos da carteira: preço médio (método da B3), dividendos por mês e evolução. Funções puras. */
import type { Dividend } from "./dividends";

/** Compra: o preço médio é a média ponderada de tudo o que foi comprado. */
export function applyBuy(qty: number, avg: number | null, buyQty: number, buyPrice: number): { qty: number; avg: number } {
  const base = avg === null ? 0 : qty * avg;
  const total = qty + buyQty;
  return { qty: total, avg: total > 0 ? (base + buyQty * buyPrice) / total : 0 };
}

/** Venda: reduz a quantidade e mantém o preço médio (como a B3). */
export function applySell(qty: number, avg: number | null, sellQty: number): { qty: number; avg: number | null } {
  return { qty: Math.max(0, qty - sellQty), avg };
}

export interface PosDiv { ticker: string; qty: number; dividends: Dividend[] }

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Projeção mensal: repete o que o ativo pagou nos últimos 12 meses (por mês do calendário) multiplicado pela
 * quantidade que o investidor tem hoje. Devolve os próximos 12 meses a partir do mês atual.
 */
export function monthlyIncome(pos: PosDiv[], today: string): { month: string; total: number; byTicker: Record<string, number> }[] {
  const from = ymd(new Date(new Date(`${today}T00:00:00Z`).getTime() - 365 * 86400000));
  const t = new Date(`${today}T00:00:00Z`);
  const out: { month: string; total: number; byTicker: Record<string, number> }[] = [];
  for (let k = 0; k < 12; k++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + k, 1));
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const byTicker: Record<string, number> = {};
    let total = 0;
    for (const p of pos) {
      const v = p.dividends.filter((x) => x.date > from && x.date <= today && x.date.slice(5, 7) === mm).reduce((s, x) => s + x.value, 0) * p.qty;
      if (v > 0) { byTicker[p.ticker] = v; total += v; }
    }
    out.push({ month: `${d.getUTCFullYear()}-${mm}`, total, byTicker });
  }
  return out;
}

/** Evolução mensal da carteira com as quantidades de hoje: soma qtd × fechamento do mês + o que não tem preço de mercado. */
export function evolution(pos: { qty: number; monthly: { m: string; close: number }[] }[], fixed: number, months: string[]): { m: string; value: number; ok: boolean }[] {
  return months.map((m) => {
    let value = fixed;
    let ok = pos.length > 0;
    for (const p of pos) {
      const hit = [...p.monthly].reverse().find((x) => x.m <= m);
      if (hit) value += hit.close * p.qty; else ok = false;
    }
    return { m, value, ok };
  });
}

export function lastMonths(today: string, n: number): string[] {
  const t = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}
