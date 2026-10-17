"use client";

import { useMemo, useState } from "react";
import { cdbEquivalentPercent, irRate, simulate, type FixedIncomeKind } from "@/lib/fixedincome";
import { brl, pct } from "@/lib/format";

export function FixedIncomeComparator({ cdi, selic }: { cdi: number | null; selic: number | null }) {
  const [cdiRate, setCdiRate] = useState(cdi ?? 14);
  const [selicRate, setSelicRate] = useState(selic ?? 14.25);
  const [amount, setAmount] = useState(10000);
  const [days, setDays] = useState(365);
  const [cdbPct, setCdbPct] = useState(105);
  const [lciPct, setLciPct] = useState(92);

  const rows = useMemo(() => {
    const base = { cdiAnnual: cdiRate, selicAnnual: selicRate, amount, days };
    const items: { label: string; kind: FixedIncomeKind; percentCdi: number }[] = [
      { label: `CDB ${cdbPct}% do CDI`, kind: "cdb", percentCdi: cdbPct },
      { label: `LCI/LCA ${lciPct}% do CDI (isenta de IR)`, kind: "lci_lca", percentCdi: lciPct },
      { label: "Tesouro Selic", kind: "tesouro_selic", percentCdi: 100 },
    ];
    return items.map((i) => ({ ...i, r: simulate({ ...base, kind: i.kind, percentCdi: i.percentCdi }) })).sort((a, b) => b.r.net - a.r.net);
  }, [cdiRate, selicRate, amount, days, cdbPct, lciPct]);

  const num = (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value.replace(",", "."));
    if (Number.isFinite(v)) set(v);
  };

  return (
    <div className="card p-4">
      <h2 className="mb-3 font-semibold">Comparador líquido (já descontado o imposto)</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className="label">Valor aplicado (R$)</label><input className="input" type="number" min={1} value={amount} onChange={num(setAmount)} /></div>
        <div><label className="label">Prazo (dias)</label><input className="input" type="number" min={1} value={days} onChange={num((n) => setDays(Math.max(1, Math.round(n))))} /></div>
        <div><label className="label">CDI (% a.a.)</label><input className="input" type="number" step="0.01" value={cdiRate} onChange={num(setCdiRate)} /></div>
        <div><label className="label">Selic (% a.a.)</label><input className="input" type="number" step="0.01" value={selicRate} onChange={num(setSelicRate)} /></div>
        <div><label className="label">CDB (% do CDI)</label><input className="input" type="number" step="0.5" value={cdbPct} onChange={num(setCdbPct)} /></div>
        <div><label className="label">LCI/LCA (% do CDI)</label><input className="input" type="number" step="0.5" value={lciPct} onChange={num(setLciPct)} /></div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="data">
          <thead><tr><th>Opção</th><th className="num">Bruto</th><th className="num">IR</th><th className="num">Taxas</th><th className="num">Líquido</th><th className="num">Lucro líquido</th><th className="num">% a.a. líquido</th></tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.kind}>
                <td className={i === 0 ? "font-semibold text-gold-soft" : ""}>{i === 0 ? "🏆 " : ""}{row.label}</td>
                <td className="num">{brl(row.r.gross)}</td>
                <td className="num">{brl(row.r.ir)}</td>
                <td className="num">{brl(row.r.fees)}</td>
                <td className="num">{brl(row.r.net)}</td>
                <td className="num">{brl(row.r.netProfit)}</td>
                <td className="num">{pct(row.r.netAnnualPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">
        Para o prazo de {days} dias o IR do CDB é de {pct(irRate(days) * 100, 1)}. Um CDB precisaria pagar cerca de <strong className="text-white">{pct(cdbEquivalentPercent(lciPct, days), 1)} do CDI</strong> para empatar com uma LCI/LCA de {lciPct}% do CDI.
      </p>
      <p className="mt-2 text-xs text-muted">
        Simulação simplificada: taxas constantes, sem IOF (aplica-se só a resgates em menos de 30 dias) e com a custódia de 0,10% a.a. da B3 no Tesouro Selic sem a isenção para valores baixos. Confira as condições reais na instituição.
      </p>
    </div>
  );
}
