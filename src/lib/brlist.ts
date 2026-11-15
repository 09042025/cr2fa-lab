/** Complementos das listas brasileiras: valor de mercado dos FIIs e bolinha de pontos de atenção, só com dados já guardados (sem esperar a rede). */
import type { Quote as Row } from "./market";
import { getQuote, type Quote } from "./dividends";
import { getFiiData } from "./cvm";
import { assessStockOrFii, isCritical } from "./assess";
import { peek, pool } from "./usmarket";

export interface Extra { mc: number | null; a: { points: number; total: number; critical: boolean } | null; ready: boolean }

const g = globalThis as unknown as { __brWarm?: boolean };
/** Em segundo plano, guarda o histórico de proventos dos ativos mais negociados (poucas conexões por vez). */
export function warmBr(rows: Row[]): void {
  if (g.__brWarm) return;
  const missing = [...rows].sort((a, b) => (b.volume ?? 0) * (b.price ?? 0) - (a.volume ?? 0) * (a.price ?? 0)).filter((r) => !peek<Quote>(`yahoo:div:${r.symbol}:v3`));
  if (!missing.length) return;
  g.__brWarm = true;
  void pool(missing, 4, async (r) => { try { await getQuote(r.symbol); } catch { /* segue */ } }).finally(() => { g.__brWarm = false; });
}

export async function brExtras(rows: Row[], fii: boolean): Promise<Map<string, Extra>> {
  const fiiData = fii ? getFiiData().data : null;
  const out = new Map<string, Extra>();
  await Promise.all(rows.map(async (r) => {
    const quote = peek<Quote>(`yahoo:div:${r.symbol}:v3`);
    const rec = fiiData?.byPrefix[r.symbol.slice(0, 4)];
    const cotas = rec?.patrimonio && rec.vpa ? rec.patrimonio / rec.vpa : null;
    const mc = r.marketCap ?? (cotas && r.price ? cotas * r.price : null);
    let a: Extra["a"] = null;
    if (quote) {
      try {
        const s = await assessStockOrFii(r.symbol, fii, { name: r.name, marketCap: mc, price: r.price, quote });
        if (s.total > 0) a = { points: s.bad + s.warn, total: s.total, critical: isCritical(s) };
      } catch { /* sem bolinha */ }
    }
    out.set(r.symbol, { mc, a, ready: !!quote });
  }));
  return out;
}
