"use client";

import { useMemo, useState } from "react";
import { brl } from "@/lib/format";
import { annualFromMonthly, minIncome, monthlyFromAnnual, schedule, summarize, type Amortization } from "@/lib/financing";

type Kind = "imovel" | "veiculo";

const PRESETS: Record<Kind, { label: string; value: number; down: number; rate: number; unit: "a.a." | "a.m."; span: number; spanUnit: "anos" | "meses"; extra: number; terms: number[] }> = {
  imovel: { label: "Imóvel", value: 500000, down: 100000, rate: 11.5, unit: "a.a.", span: 30, spanUnit: "anos", extra: 150, terms: [120, 180, 240, 300, 360, 420] },
  veiculo: { label: "Veículo", value: 80000, down: 20000, rate: 1.9, unit: "a.m.", span: 48, spanUnit: "meses", extra: 0, terms: [12, 24, 36, 48, 60, 72] },
};

const fmtPct = (v: number) => v.toFixed(2).replace(".", ",");
const label = (m: number) => (m % 12 === 0 ? `${m / 12} ${m / 12 === 1 ? "ano" : "anos"}` : `${m} meses`);

export function FinancingSimulator() {
  const [kind, setKind] = useState<Kind>("imovel");
  const [value, setValue] = useState(PRESETS.imovel.value);
  const [down, setDown] = useState(PRESETS.imovel.down);
  const [rate, setRate] = useState(PRESETS.imovel.rate);
  const [rateUnit, setRateUnit] = useState<"a.a." | "a.m.">(PRESETS.imovel.unit);
  const [span, setSpan] = useState(PRESETS.imovel.span);
  const [spanUnit, setSpanUnit] = useState<"anos" | "meses">(PRESETS.imovel.spanUnit);
  const [extra, setExtra] = useState(PRESETS.imovel.extra);
  const [system, setSystem] = useState<Amortization>("price");

  const pick = (k: Kind) => {
    const p = PRESETS[k];
    setKind(k); setValue(p.value); setDown(p.down); setRate(p.rate); setRateUnit(p.unit); setSpan(p.span); setSpanUnit(p.spanUnit); setExtra(p.extra);
  };

  const months = Math.min(480, Math.max(1, Math.round(spanUnit === "anos" ? span * 12 : span)));
  const principal = Math.max(0, value - down);
  const monthlyPct = rateUnit === "a.m." ? Math.max(0, rate) : monthlyFromAnnual(Math.max(0, rate));
  const annualPct = rateUnit === "a.a." ? Math.max(0, rate) : annualFromMonthly(Math.max(0, rate));
  const rows = useMemo(() => schedule(principal, monthlyPct, months, system, Math.max(0, extra)), [principal, monthlyPct, months, system, extra]);
  const sum = summarize(rows, Math.max(0, extra));
  const downPct = value > 0 ? (down / value) * 100 : 0;
  const n = (set: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value.replace(",", "."));
    if (Number.isFinite(v)) set(v);
  };

  const compare = useMemo(
    () => PRESETS[kind].terms.map((t) => ({ t, s: summarize(schedule(principal, monthlyPct, t, system, Math.max(0, extra)), Math.max(0, extra)) })),
    [kind, principal, monthlyPct, system, extra],
  );
  const checkpoints = useMemo(() => {
    const picks = new Set<number>();
    for (let k = 1; k <= 6; k++) picks.add(Math.round((months * k) / 6));
    return rows.filter((r) => picks.has(r.month));
  }, [rows, months]);

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(PRESETS) as Kind[]).map((k) => (
            <button key={k} type="button" onClick={() => pick(k)} className={`btn ${kind === k ? "btn-gold" : "btn-ghost"}`}>{PRESETS[k].label}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="label">Valor do {kind === "imovel" ? "imóvel" : "veículo"} (R$)</label><input className="input" type="number" min={0} value={value} onChange={n(setValue)} /></div>
          <div>
            <label className="label">Entrada (R$)</label>
            <input className="input" type="number" min={0} value={down} onChange={n(setDown)} />
            <p className="mt-1 text-xs text-muted">{fmtPct(downPct)}% do valor. Financiado: <strong className="text-white">{brl(principal)}</strong></p>
          </div>
          <div>
            <label className="label">Taxa de juros</label>
            <div className="flex gap-2">
              <input className="input" type="number" step="0.01" min={0} value={rate} onChange={n(setRate)} />
              <select className="input !w-auto" value={rateUnit} onChange={(e) => {
                const u = e.target.value as "a.a." | "a.m.";
                if (u !== rateUnit) setRate(Number((u === "a.m." ? monthlyFromAnnual(rate) : annualFromMonthly(rate)).toFixed(2)));
                setRateUnit(u);
              }} aria-label="Unidade da taxa">
                <option value="a.a.">% ao ano</option>
                <option value="a.m.">% ao mês</option>
              </select>
            </div>
            <p className="mt-1 text-xs text-muted">Equivale a {fmtPct(monthlyPct)}% ao mês e {fmtPct(annualPct)}% ao ano.</p>
          </div>
          <div>
            <label className="label">Prazo</label>
            <div className="flex gap-2">
              <input className="input" type="number" min={1} max={spanUnit === "anos" ? 40 : 480} value={span} onChange={n((v) => setSpan(Math.max(1, Math.round(v))))} />
              <select className="input !w-auto" value={spanUnit} onChange={(e) => { const u = e.target.value as "anos" | "meses"; setSpan(u === "anos" ? Math.max(1, Math.round(months / 12)) : months); setSpanUnit(u); }} aria-label="Unidade do prazo">
                <option value="anos">anos</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Seguros e tarifas por mês (R$)</label>
            <input className="input" type="number" min={0} value={extra} onChange={n(setExtra)} />
          </div>
          <div>
            <label className="label">Sistema de amortização</label>
            <select className="input" value={system} onChange={(e) => setSystem(e.target.value as Amortization)}>
              <option value="price">Price (parcela fixa)</option>
              <option value="sac">SAC (parcela decrescente)</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Os valores iniciais são exemplos. Use a taxa e os custos da proposta do banco. Price: parcelas iguais. SAC: começa mais alta e cai todo mês, e costuma pagar menos juros no total.
        </p>
      </div>

      {rows.length > 0 ? (
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Resultado em {label(months)}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-xs uppercase tracking-wider text-muted">{system === "price" ? "Parcela mensal" : "Primeira parcela"}</p>
              <p className="mt-1 text-2xl font-bold text-gold-soft">{brl(sum.first)}</p>
              {system === "sac" && <p className="mt-1 text-sm text-muted">Cai até <strong className="text-white">{brl(sum.last)}</strong> na última.</p>}
              <p className="mt-1 text-xs text-muted">Renda mensal sugerida: {brl(minIncome(sum.first))} (parcela até 30% da renda).</p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs uppercase tracking-wider text-muted">Total pago no fim</p>
              <p className="mt-1 text-2xl font-bold">{brl(sum.total)}</p>
              <p className="mt-1 text-sm text-muted">Mais a entrada de {brl(down)}: <strong className="text-white">{brl(sum.total + down)}</strong>.</p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs uppercase tracking-wider text-muted">Juros pagos</p>
              <p className="mt-1 text-2xl font-bold text-down">{brl(sum.interest)}</p>
              <p className="mt-1 text-sm text-muted">{principal > 0 ? `${((sum.interest / principal) * 100).toFixed(0)}% do valor financiado.` : ""}{sum.extraTotal > 0 ? ` Seguros e tarifas: ${brl(sum.extraTotal)}.` : ""}</p>
            </div>
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold">Quanto fica a parcela conforme o prazo</h3>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>Prazo</th><th className="num">{system === "price" ? "Parcela" : "1ª parcela"}</th><th className="num">Juros totais</th><th className="num">Total pago</th></tr></thead>
              <tbody>
                {compare.map(({ t, s }) => (
                  <tr key={t} className={t === months ? "text-gold-soft" : ""}>
                    <td>{label(t)}{t === months ? " (seu prazo)" : ""}</td>
                    <td className="num">{brl(s.first)}</td><td className="num">{brl(s.interest)}</td><td className="num">{brl(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Prazo maior reduz a parcela, mas aumenta muito o total de juros.</p>

          <h3 className="mb-2 mt-6 text-sm font-semibold">Saldo devedor ao longo do tempo</h3>
          <div className="overflow-x-auto">
            <table className="data">
              <thead><tr><th>Mês</th><th className="num">Parcela</th><th className="num">Juros</th><th className="num">Amortização</th><th className="num">Saldo devedor</th></tr></thead>
              <tbody>
                {checkpoints.map((r) => (
                  <tr key={r.month}><td>{r.month}</td><td className="num">{brl(r.payment)}</td><td className="num">{brl(r.interest)}</td><td className="num">{brl(r.amortization)}</td><td className="num">{brl(r.balance)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-4 text-sm text-muted">Informe um valor maior que a entrada para simular o financiamento.</div>
      )}
      <p className="text-xs text-muted">Simulação ilustrativa com taxa constante. Não inclui correção por TR ou IPCA, IOF, avaliação do bem, registro nem outras taxas. O custo efetivo total (CET) da proposta real pode ser maior.</p>
    </div>
  );
}
