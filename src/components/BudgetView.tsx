"use client";

import { useMemo, useState } from "react";
import { BUDGET_CATS, computeBudget, fmtMonths, idealAmounts, parseBRL, sumAmounts, type Amounts, type BudgetInput, type CatId } from "@/lib/budget-calc";

const COLORS: Record<CatId, string> = { moradia: "#1f77b4", alimentacao: "#ff7f0e", transporte: "#2ca02c", saude: "#9467bd", lazer: "#e377c2", reserva: "#17becf" };
const FREE_COLOR = "#64748b";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number) => (v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");

interface Slice { id: string; label: string; value: number; color: string }

function Donut({ slices, center, sub }: { slices: Slice[]; center: string; sub: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 70, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div>
      <svg viewBox="0 0 200 200" className="mx-auto block h-56 w-56" role="img" aria-label={`${center} ${sub}`}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#1e293b" strokeWidth="34" />
        {total > 0 && slices.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * c;
          const el = <circle key={s.id} cx="100" cy="100" r={r} fill="none" stroke={s.color} strokeWidth="34" strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-acc} transform="rotate(-90 100 100)" />;
          acc += len;
          return el;
        })}
        <text x="100" y="97" textAnchor="middle" className="fill-white" fontSize="17" fontWeight="700">{center}</text>
        <text x="100" y="115" textAnchor="middle" className="fill-slate-400" fontSize="9.5">{sub}</text>
      </svg>
      <ul className="mt-3 space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} /><span className="truncate text-muted">{s.label}</span></span>
            <span className="whitespace-nowrap font-semibold">{brl(s.value)} <span className="text-xs font-normal text-muted">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  const color = p >= 100 ? "#34d399" : p >= 50 ? "#facc15" : p >= 25 ? "#fb923c" : "#f87171";
  const r = 80, len = Math.PI * r;
  return (
    <svg viewBox="0 0 200 120" className="mx-auto block w-full max-w-xs" role="img" aria-label={`Meta da reserva: ${p.toFixed(0)}%`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={color} strokeWidth="18" strokeLinecap="round" strokeDasharray={`${(p / 100) * len} ${len}`} />
      <text x="100" y="92" textAnchor="middle" className="fill-white" fontSize="30" fontWeight="700">{p.toFixed(0)}%</text>
      <text x="100" y="112" textAnchor="middle" className="fill-slate-400" fontSize="9.5">da reserva de 12 meses</text>
    </svg>
  );
}

export function BudgetView({ saved }: { saved: BudgetInput | null }) {
  const [income, setIncome] = useState(num(saved?.income ?? 0));
  const [reserveNow, setReserveNow] = useState(num(saved?.reserveNow ?? 0));
  const [actual, setActual] = useState<Record<CatId, string>>(() => Object.fromEntries(BUDGET_CATS.map((c) => [c.id, num(saved?.actual[c.id] ?? 0)])) as Record<CatId, string>);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const input = useMemo<BudgetInput>(() => ({
    income: parseBRL(income),
    reserveNow: parseBRL(reserveNow),
    actual: Object.fromEntries(BUDGET_CATS.map((c) => [c.id, parseBRL(actual[c.id])])) as Amounts,
  }), [income, reserveNow, actual]);
  const r = useMemo(() => computeBudget(input), [input]);
  const ideal = useMemo(() => idealAmounts(input.income), [input.income]);
  const hasIncome = input.income > 0;
  const total = sumAmounts(input.actual);

  const idealSlices: Slice[] = BUDGET_CATS.map((c) => ({ id: c.id, label: `${c.label} (${c.ideal}%)`, value: ideal[c.id], color: COLORS[c.id] }));
  const nowSlices: Slice[] = [
    ...BUDGET_CATS.map((c) => ({ id: c.id, label: c.label, value: input.actual[c.id], color: COLORS[c.id] })),
    ...(hasIncome && r.sobra > 0 ? [{ id: "sobra", label: "Sem destino (sobra)", value: r.sobra, color: FREE_COLOR }] : []),
  ];

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/budget", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    setBusy(false);
    setMsg(res.ok ? "Orçamento salvo." : ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar.");
  }

  const field = "input w-full";
  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold text-gold-soft">1. Sua realidade hoje</h2>
        <p className="mt-1 text-sm text-muted">Preencha com valores mensais, do jeito que é a sua vida hoje. Não precisa ser exato: uma boa estimativa já funciona.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Renda líquida mensal da família</span>
            <span className="block text-xs text-muted">O que realmente cai na conta, depois dos descontos.</span>
            <input className={field} inputMode="decimal" placeholder="Ex.: 8.000" value={income} onChange={(e) => setIncome(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Reserva de emergência que você já tem</span>
            <span className="block text-xs text-muted">Dinheiro guardado com liquidez, só para imprevistos.</span>
            <input className={field} inputMode="decimal" placeholder="Ex.: 5.000" value={reserveNow} onChange={(e) => setReserveNow(e.target.value)} />
          </label>
          {BUDGET_CATS.map((c) => (
            <label key={c.id} className="block">
              <span className="flex items-center gap-2 text-sm font-semibold"><span className="h-3 w-3 rounded-sm" style={{ background: COLORS[c.id] }} />{c.label}</span>
              <span className="block text-xs text-muted">{c.hint}{hasIncome ? ` Ideal: ${brl(ideal[c.id])} (${c.ideal}%).` : ""}</span>
              <input className={field} inputMode="decimal" placeholder="R$ por mês" value={actual[c.id]} onChange={(e) => setActual({ ...actual, [c.id]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar meu orçamento"}</button>
          {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
        </div>
        {hasIncome && total > 0 && (
          <p className={`mt-3 text-sm ${r.sobra < 0 ? "text-down" : "text-muted"}`}>
            {r.sobra < 0 ? `Atenção: você gasta ${brl(-r.sobra)} a mais do que ganha por mês. Resolver isso vem antes de investir.` : r.sobra === 0 ? "Toda a sua renda já tem destino." : `Sobram ${brl(r.sobra)} por mês sem destino. Dá para direcionar para a reserva.`}
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 md:p-5">
          <h2 className="font-display text-lg font-bold text-gold-soft">O ideal</h2>
          <p className="mb-3 text-sm text-muted">Divisão de referência aplicada à sua renda{hasIncome ? "" : " (informe a renda acima)"}.</p>
          <Donut slices={idealSlices} center={brl(input.income)} sub="renda por mês" />
        </div>
        <div className="card p-4 md:p-5">
          <h2 className="font-display text-lg font-bold text-gold-soft">Como você está hoje</h2>
          <p className="mb-3 text-sm text-muted">Com os valores que você preencheu.</p>
          <Donut slices={nowSlices} center={brl(Math.max(total, 0))} sub="gasto por mês" />
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <h2 className="font-display text-lg font-bold text-gold-soft">2. Reserva de emergência de 12 meses</h2>
        <p className="mt-1 text-sm text-muted">
          Antes de investir, a base é ter dinheiro para 12 meses do seu custo de vida essencial (moradia, alimentação, transporte, saúde e educação). {r.usedIdealEssentials ? "Como você ainda não preencheu esses gastos, usei os valores ideais para a sua renda." : "Calculado com os seus gastos reais."}
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <Gauge pct={r.pct} />
            <p className="mt-1 text-center text-sm text-muted">
              Você tem {brl(input.reserveNow)} de {brl(r.goal)}. {r.coveredMonths >= 12 ? "Sua reserva já cobre 12 meses." : `Isso cobre cerca de ${r.coveredMonths.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${r.coveredMonths >= 1.95 ? "meses" : "mês"} de custo essencial.`}
            </p>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="rounded-lg border border-line p-3"><dt className="text-muted">Custo essencial por mês</dt><dd className="text-lg font-bold">{brl(r.essentialMonthly)}</dd></div>
            <div className="rounded-lg border border-gold/50 p-3"><dt className="text-muted">Sua meta (12 meses)</dt><dd className="text-xl font-bold text-gold-soft">{brl(r.goal)}</dd></div>
            <div className="rounded-lg border border-line p-3"><dt className="text-muted">Falta juntar</dt><dd className="text-lg font-bold">{brl(r.falta)}</dd></div>
          </dl>
        </div>
        {hasIncome && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-line p-3 text-sm">
              <div className="text-muted">No seu ritmo de hoje ({brl(r.aporteNow)} por mês)</div>
              <div className="mt-1 text-lg font-bold">{r.monthsNow === null ? "Defina quanto guarda por mês" : fmtMonths(r.monthsNow)}</div>
            </div>
            <div className="rounded-lg border border-line p-3 text-sm">
              <div className="text-muted">Guardando o ideal ({brl(r.aporteIdeal)} por mês, 20%)</div>
              <div className="mt-1 text-lg font-bold text-up">{fmtMonths(r.monthsIdeal)}</div>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">Conteúdo educativo, sem recomendação de investimento. O cálculo é simples: não considera inflação nem rendimento da reserva, e os percentuais ideais são uma referência geral. Mantenha a reserva em aplicação de liquidez diária e baixo risco.</p>
      </section>
    </div>
  );
}
