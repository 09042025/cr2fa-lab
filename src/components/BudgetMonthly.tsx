"use client";

import { useMemo, useState } from "react";
import { BUDGET_CATS, MONTH_NAMES, computeBudget, monthStats, parseBRL, ymOf, type Amounts, type BudgetInput, type CatId, type MonthEntry } from "@/lib/budget-calc";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v: number | null) => (v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");

export function BudgetMonthly({ initial, base }: { initial: MonthEntry[]; base: BudgetInput | null }) {
  const today = new Date();
  const curYm = ymOf(today.getFullYear(), today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [entries, setEntries] = useState<Record<string, MonthEntry>>(() => Object.fromEntries(initial.map((m) => [m.ym, m])));
  const [open, setOpen] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [reserve, setReserve] = useState("");
  const [vals, setVals] = useState<Record<CatId, string>>(() => Object.fromEntries(BUDGET_CATS.map((c) => [c.id, ""])) as Record<CatId, string>);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const goalBase = useMemo(() => (base ? computeBudget(base).goal : 0), [base]);

  function openMonth(ym: string) {
    const e = entries[ym];
    setOpen(ym); setMsg("");
    setIncome(num(e ? e.income : base?.income ?? 0));
    setReserve(num(e?.reserve ?? null));
    setVals(Object.fromEntries(BUDGET_CATS.map((c) => [c.id, num(e ? e.actual[c.id] : 0)])) as Record<CatId, string>);
  }

  const draft = useMemo(() => {
    const actual = Object.fromEntries(BUDGET_CATS.map((c) => [c.id, parseBRL(vals[c.id])])) as Amounts;
    return { actual, income: parseBRL(income), reserve: reserve.trim() ? parseBRL(reserve) : null };
  }, [vals, income, reserve]);
  const stats = useMemo(() => monthStats(draft.income, draft.actual), [draft]);

  async function save() {
    if (!open) return;
    setBusy(true); setMsg("");
    const body = { ym: open, income: draft.income, reserve: draft.reserve, actual: draft.actual };
    const res = await fetch("/api/budget/months", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) { setMsg(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar."); return; }
    setEntries((p) => ({ ...p, [open]: body }));
    setMsg("Mês salvo.");
  }

  async function remove() {
    if (!open || !entries[open] || !confirm("Apagar o registro deste mês?")) return;
    setBusy(true);
    const res = await fetch("/api/budget/months", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ ym: open }) });
    setBusy(false);
    if (res.ok) { setEntries((p) => { const n = { ...p }; delete n[open]; return n; }); setOpen(null); }
  }

  const months = MONTH_NAMES.map((name, i) => {
    const ym = ymOf(year, i);
    const e = entries[ym];
    return { name, ym, e, future: ym > curYm, st: e ? monthStats(e.income, e.actual) : null };
  });
  const registered = months.filter((m) => m.e && m.st);
  const yearSpent = registered.reduce((s, m) => s + (m.st!.total - m.e!.actual.reserva), 0);
  const yearSaved = registered.reduce((s, m) => s + m.e!.actual.reserva, 0);
  const withReserve = months.filter((m) => m.e?.reserve != null);
  const lastReg = [...registered].reverse()[0];
  const lastGoal = lastReg ? computeBudget({ income: lastReg.e!.income, actual: lastReg.e!.actual, reserveNow: 0 }).goal : 0;
  const goal = lastGoal > 0 && !computeBudget({ income: lastReg!.e!.income, actual: lastReg!.e!.actual, reserveNow: 0 }).usedIdealEssentials ? lastGoal : goalBase;
  const maxRes = Math.max(goal, ...withReserve.map((m) => m.e!.reserve ?? 0), 1);
  const field = "input w-full";

  return (
    <section className="card p-4 md:p-5" id="acompanhamento">
      <h2 className="font-display text-lg font-bold text-gold-soft">3. Acompanhamento mês a mês</h2>
      <p className="mt-1 text-sm text-muted">Toque em um mês do calendário e registre quanto você gastou em cada categoria. É assim que o orçamento vira controle de verdade.</p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => { setYear(year - 1); setOpen(null); }} aria-label="Ano anterior">‹</button>
        <span className="font-display text-lg font-bold">{year}</span>
        <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => { setYear(year + 1); setOpen(null); }} aria-label="Próximo ano">›</button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
        {months.map((m) => {
          const st = m.st;
          const tone = !st ? "border-line text-muted" : st.sobra < 0 ? "border-down/60" : st.overspent > 0 ? "border-gold/60" : "border-up/60";
          return (
            <button key={m.ym} type="button" disabled={m.future} onClick={() => openMonth(m.ym)} aria-pressed={open === m.ym}
              className={`rounded-xl border p-2 text-left transition ${tone} ${open === m.ym ? "bg-panel-2 ring-1 ring-gold" : "hover:bg-panel-2"} ${m.future ? "cursor-not-allowed opacity-40" : ""}`}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{m.name.slice(0, 3)}</span>
                {m.ym === curYm && <span className="rounded bg-gold/20 px-1 text-[10px] text-gold-soft">hoje</span>}
              </div>
              {st ? (
                <>
                  <div className="mt-1 text-sm font-bold">{brl(st.total)}</div>
                  <div className={`text-[11px] ${st.sobra < 0 ? "text-down" : "text-up"}`}>{st.sobra < 0 ? `falta ${brl(-st.sobra)}` : `sobra ${brl(st.sobra)}`}</div>
                </>
              ) : <div className="mt-1 text-[11px]">{m.future ? "—" : "registrar"}</div>}
            </button>
          );
        })}
      </div>

      {registered.length > 0 && (
        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-line p-2"><dt className="text-xs text-muted">Meses registrados</dt><dd className="font-bold">{registered.length}</dd></div>
          <div className="rounded-lg border border-line p-2"><dt className="text-xs text-muted">Gasto médio/mês</dt><dd className="font-bold">{brl(yearSpent / registered.length)}</dd></div>
          <div className="rounded-lg border border-line p-2"><dt className="text-xs text-muted">Guardado no ano</dt><dd className="font-bold text-up">{brl(yearSaved)}</dd></div>
        </dl>
      )}

      {open && (
        <div className="mt-5 rounded-xl border border-gold/40 p-3 md:p-4">
          <h3 className="font-display text-base font-bold text-gold-soft">{MONTH_NAMES[Number(open.slice(5)) - 1]} de {open.slice(0, 4)}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block"><span className="text-sm font-semibold">Renda do mês</span><input className={field} inputMode="decimal" placeholder="R$" value={income} onChange={(e) => setIncome(e.target.value)} /></label>
            <label className="block"><span className="text-sm font-semibold">Saldo da reserva de emergência no fim do mês</span><input className={field} inputMode="decimal" placeholder="R$ (opcional)" value={reserve} onChange={(e) => setReserve(e.target.value)} /></label>
            {BUDGET_CATS.map((c) => {
              const row = stats.rows.find((r) => r.id === c.id)!;
              return (
                <label key={c.id} className="block">
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="block text-xs text-muted">{draft.income > 0 ? `Ideal: ${brl(row.ideal)}` : "Informe a renda do mês"}{vals[c.id] && draft.income > 0 ? <> · <span className={row.bad ? "text-down" : "text-up"}>{row.diff === 0 ? "no ideal" : row.diff > 0 ? `${brl(row.diff)} acima` : `${brl(-row.diff)} abaixo`}</span></> : null}</span>
                  <input className={field} inputMode="decimal" placeholder="R$ no mês" value={vals[c.id]} onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })} />
                </label>
              );
            })}
          </div>
          {draft.income > 0 && stats.total > 0 && (
            <p className={`mt-3 text-sm ${stats.sobra < 0 ? "text-down" : "text-muted"}`}>
              Total do mês: {brl(stats.total)}. {stats.sobra < 0 ? `Você gastou ${brl(-stats.sobra)} a mais do que ganhou.` : stats.sobra === 0 ? "Toda a renda teve destino." : `Sobraram ${brl(stats.sobra)}.`}
              {stats.overspent > 0 ? ` Nas categorias de gasto, passou ${brl(stats.overspent)} do ideal.` : ""}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar mês"}</button>
            {entries[open] && <button type="button" className="btn btn-ghost !text-down" onClick={remove} disabled={busy}>Apagar registro</button>}
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(null)}>Fechar</button>
            {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
          </div>
        </div>
      )}

      {withReserve.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-base font-bold text-gold-soft">Evolução da reserva em {year}</h3>
          <p className="text-xs text-muted">Saldo no fim de cada mês{goal > 0 ? ` e meta de 12 meses (${brl(goal)})` : ""}.</p>
          <div className="relative mt-3 flex h-36 items-end gap-1.5 border-b border-line">
            {goal > 0 && <div className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-gold/70" style={{ bottom: `${(goal / maxRes) * 100}%` }} />}
            {months.map((m) => {
              const v = m.e?.reserve ?? null;
              return (
                <div key={m.ym} className="flex h-full flex-1 flex-col items-center justify-end">
                  {v !== null && <div className="w-full rounded-t bg-cyan-500/80" style={{ height: `${(v / maxRes) * 100}%` }} title={`${m.name}: ${brl(v)}`} />}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1.5 text-center text-[10px] text-muted">{months.map((m) => <span key={m.ym} className="flex-1">{m.name.slice(0, 1)}</span>)}</div>
        </div>
      )}
    </section>
  );
}
