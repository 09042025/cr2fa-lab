"use client";

import { useMemo, useState } from "react";
import { planAllocation, futureValue, EMERGENCY_RESERVE_MONTHS } from "@/lib/protocol";
import { brl } from "@/lib/format";

export function ProtocolCalculator() {
  const [total, setTotal] = useState(100000);
  const [salary, setSalary] = useState(8000);
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(20);

  const plan = useMemo(() => planAllocation(Math.round(Math.max(0, total) * 100)), [total]);
  const fv = futureValue(monthly, rate, years);
  const invested = monthly * years * 12;
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
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">Aporte mensal (R$)</label><input className="input" type="number" min={0} value={monthly} onChange={n(setMonthly)} /></div>
          <div><label className="label">Retorno (% a.a.)</label><input className="input" type="number" step="0.5" value={rate} onChange={n(setRate)} /></div>
          <div><label className="label">Anos</label><input className="input" type="number" min={1} max={60} value={years} onChange={n((v) => setYears(Math.min(60, Math.max(1, Math.round(v)))))} /></div>
        </div>
        <p className="mt-4 text-sm text-muted">
          Você aporta <strong className="text-white">{brl(invested)}</strong> e chega a <strong className="text-lg text-gold-soft">{brl(fv)}</strong>. Os juros respondem por {brl(fv - invested)}.
        </p>
        <p className="mt-1 text-xs text-muted">Projeção ilustrativa com taxa constante; retornos reais variam e podem ser negativos.</p>
      </div>
    </div>
  );
}
