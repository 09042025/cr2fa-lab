import { getUser } from "@/lib/auth";
import { cdbEquivalentPercent, irRate, simulate, type FixedIncomeKind } from "@/lib/fixedincome";
import { fail, json } from "@/lib/http";
import { getRates } from "@/lib/market";

const n = (v: string | null, d: number, min: number, max: number) => { const x = Number((v ?? "").replace(",", ".")); return Number.isFinite(x) && v !== null && v !== "" ? Math.min(max, Math.max(min, x)) : d; };

/** Renda fixa para o app: taxas do Banco Central e, no Premium, o comparador líquido (mesma conta do site). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const rates = await getRates();
  const pro = user.plan === "pro" || user.role === "admin";
  const base = { rates: rates.data ? { selic: rates.data.selic, cdi: rates.data.cdi, ipca12m: rates.data.ipca12m } : null, pro, failed: rates.data === null, stale: rates.stale };
  if (!pro) return json(base);
  const sp = new URL(req.url).searchParams;
  const cdi = n(sp.get("cdi"), rates.data?.cdi ?? 14, 0, 100);
  const selic = n(sp.get("selic"), rates.data?.selic ?? 14.25, 0, 100);
  const amount = n(sp.get("amount"), 10000, 1, 1e9);
  const days = Math.round(n(sp.get("days"), 365, 1, 36500));
  const cdb = n(sp.get("cdb"), 105, 0, 300);
  const lci = n(sp.get("lci"), 92, 0, 300);
  const items: { label: string; kind: FixedIncomeKind; percentCdi: number }[] = [
    { label: `CDB ${cdb}% do CDI`, kind: "cdb", percentCdi: cdb },
    { label: `LCI/LCA ${lci}% do CDI (isenta de IR)`, kind: "lci_lca", percentCdi: lci },
    { label: "Tesouro Selic", kind: "tesouro_selic", percentCdi: 100 },
  ];
  const rows = items.map((i) => ({ label: i.label, ...simulate({ cdiAnnual: cdi, selicAnnual: selic, amount, days, kind: i.kind, percentCdi: i.percentCdi }) })).sort((a, b) => b.net - a.net);
  return json({ ...base, input: { cdi, selic, amount, days, cdb, lci }, rows, irPct: irRate(days) * 100, cdbEquivalent: cdbEquivalentPercent(lci, days) });
}
