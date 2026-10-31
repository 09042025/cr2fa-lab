"use client";

import { useMemo, useState } from "react";
import { planAllocation, projection, EMERGENCY_RESERVE_MONTHS, IPCA_MEDIO_20_ANOS } from "@/lib/protocol";
import { brl } from "@/lib/format";
import { CompoundChart } from "@/components/CompoundChart";

export function ProtocolCalculator() {
  const [total, setTotal] = useState(100000);
  const [salary, setSalary] = useState(8000);
  const [initial, setInitial] = useState(0);
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(10);
  const [inflation, setInflation] = useState(IPCA_MEDIO_20_ANOS);
  const [span, setSpan] = useState(20);
  const [unit, setUnit] = useState<"anos" | "meses">("anos");

  const plan = useMemo(() => planAllocation(Math.round(Math.max(0, total) * 100)), [total]);
  const months = Math.min(720, Math.max(1, Math.round(unit === "anos" ? span * 12 : span)));
  const series = useMemo(() => projection(Math.max(0, initial), Math.max(0, monthly), rate, months, inflation), [initial, monthly, rate, months, inflation]);
  const last = series[series.length - 1];
  const checkpoints = useMemo(() => {
    const picks = new Set<number>();
    for (let k = 1; k <= 6; k++) picks.add(Math.round((months * k) / 6));
    return series.filter((p) => picks.has(p.month) && p.month > 0);
  }, [series, months]);
  const lossPct = (1 - 1 / Math.pow(1 + Math.max(0, inflation) / 100, months / 12)) * 100;
  const label = (m: number) => (m % 12 === 0 ? `${m / 12} ${m / 12 === 1 ? "ano" : "anos"}` : m > 12 ? `${Math.floor(m / 12)}a ${m % 12}m` : `${m} ${m === 1 ? "mês" : "meses"}`);
  const n = (set: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value.replace(",", "."));
    if (Number.isFinite(v)) set(v);
  };

  return (
    <div className="space-y-6">
      <div className="card border-gold/50 p-4">
        <h2 className="font-semibold text-gold-soft">Etapa zero: reserva de emergência</h2>
        <div className="mt-2 grid items-end gap-3 sm:grid-cols-2">
          <div><label className="label">Seu salário mensal (R$)</label><input className="input" type="number" min={0} value={salary} onChange={n(setSalary)} /></div>
          <p className="text-sm text-muted">
            Reserva de {EMERGENCY_RESERVE_MONTHS} meses: <strong className="text-lg text-white">{brl(salary * EMERGENCY_RESERVE_MONTHS)}</strong>, separada dos cinco blocos.
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="max-w-xs">
          <label className="label">Valor a distribuir nos cinco blocos (R$)</label>
          <input className="input" type="number" min={0} value={total} onChange={n(setTotal)} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plan.map((p) => (
            <div key={p.block.key} className="rounded-xl border border-line p-3" style={{ borderTopColor: p.block.color, borderTopWidth: 3 }}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.block.name}</h3>
                <span className="font-bold" style={{ color: p.block.color }}>{brl(p.totalCents / 100)}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {p.lines.map((l, i) => (
                  <li key={i} className={`flex justify-between gap-3 ${l.depth ? "pl-4 text-xs text-muted" : "text-muted"}`}>
                    <span>{l.depth ? "↳ " : ""}{l.label}</span>
                    <span className="tabular-nums text-white">{brl(l.cents / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">Cada subdivisão se refere ao seu bloco. Ex.: 60% de Bitcoin são 60% dos 20% de cripto.</p>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-semibold">Quanto o tempo faz (juros compostos)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className="label">Valor inicial (R$)</label><input className="input" type="number" min={0} value={initial} onChange={n(setInitial)} /></div>
          <div><label className="label">Aporte mensal (R$)</label><input className="input" type="number" min={0} value={monthly} onChange={n(setMonthly)} /></div>
          <div><label className="label">Retorno (% a.a.)</label><input className="input" type="number" step="0.5" value={rate} onChange={n(setRate)} /></div>
          <div>
            <label className="label">Prazo</label>
            <div className="flex gap-2">
              <input className="input" type="number" min={1} max={unit === "anos" ? 60 : 720} value={span} onChange={n((v) => setSpan(Math.max(1, Math.round(v))))} />
              <select className="input !w-auto" value={unit} onChange={(e) => { const u = e.target.value as "anos" | "meses"; setSpan(u === "anos" ? Math.max(1, Math.round(months / 12)) : months); setUnit(u); }} aria-label="Unidade do prazo">
                <option value="anos">anos</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </div>
          <div><label className="label">Inflação (% a.a.)</label><input className="input" type="number" step="0.1" min={0} value={inflation} onChange={n(setInflation)} /></div>
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-xs uppercase tracking-wider text-muted">Perda do poder de compra</p>
            <p className="mt-1 text-2xl font-bold text-gold-soft">−{lossPct.toFixed(1).replace(".", ",")}%</p>
            <p className="mt-1 text-xs text-muted">Em {label(months)}, R$ 100 de hoje compram o equivalente a <strong className="text-white">{brl(100 - lossPct)}</strong>.</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Inflação padrão: {IPCA_MEDIO_20_ANOS.toString().replace(".", ",")}% ao ano, a média do IPCA dos últimos 20 anos (2006 a 2025). Se você está começando do zero, deixe o valor inicial em 0.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Resultado nominal</p>
            <p className="mt-1 text-2xl font-bold text-gold-soft">{brl(last.nominal)}</p>
            <p className="mt-1 text-sm text-muted">Você coloca <strong className="text-white">{brl(last.invested)}</strong>; os juros respondem por {brl(last.nominal - last.invested)}.</p>
          </div>
          <div className="rounded-xl border border-gold/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Descontada a inflação (valor de hoje)</p>
            <p className="mt-1 text-2xl font-bold text-up">{brl(last.real)}</p>
            <p className="mt-1 text-sm text-muted">É o poder de compra desse dinheiro em {label(months)}, a {inflation.toString().replace(".", ",")}% de inflação ao ano.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line p-3">
          <CompoundChart series={series} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="data">
            <thead><tr><th>Tempo</th><th className="num">Investido</th><th className="num">Nominal</th><th className="num">Valor de hoje</th></tr></thead>
            <tbody>
              {checkpoints.map((p) => (
                <tr key={p.month}><td>{label(p.month)}</td><td className="num">{brl(p.invested)}</td><td className="num">{brl(p.nominal)}</td><td className="num">{brl(p.real)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Projeção ilustrativa com taxa constante, aportes no fim de cada mês, sem impostos e sem corrigir os aportes pela inflação; retornos reais variam e podem ser negativos.</p>
      </div>
    </div>
  );
}
