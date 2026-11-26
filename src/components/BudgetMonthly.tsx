"use client";

import { useMemo, useRef, useState } from "react";
import { maskStyle, money0, money2, useHideValues } from "@/lib/hide-values";
import {
  BUDGET_CATS, MONTH_NAMES, OTHER_SUB, SUBS, combineActual, computeBudget, dayOf, daysInMonth, expenseLabel, idealAmounts, monthStats, parseBRL, rankSpending, repeatDays, ymOf,
  type Amounts, type BudgetInput, type CatId, type Expense, type MonthEntry,
} from "@/lib/budget-calc";

const brl = money0;
const brl2 = money2;
const num = (v: number | null) => (v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "");
const COLORS: Record<CatId, string> = { moradia: "#1f77b4", alimentacao: "#ff7f0e", transporte: "#2ca02c", saude: "#9467bd", lazer: "#e377c2", reserva: "#17becf" };
/** Valor curto para caber em cima da barra: 40, 850, 1,2 mil, 15 mil. */
const compactBRL = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)} mil` : v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(Math.round(v)));
const catLabel = (id: CatId) => BUDGET_CATS.find((c) => c.id === id)!.label;
const post = (url: string, method: string, body: unknown) => fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function BudgetMonthly({ initial, base, initialExpenses }: { initial: MonthEntry[]; base: BudgetInput | null; initialExpenses: Expense[] }) {
  const { hidden, toggle } = useHideValues();
  const today = new Date();
  const curYm = ymOf(today.getFullYear(), today.getMonth());
  const curDay = `${curYm}-${String(today.getDate()).padStart(2, "0")}`;
  const [year, setYear] = useState(today.getFullYear());
  const [entries, setEntries] = useState<Record<string, MonthEntry>>(() => Object.fromEntries(initial.map((m) => [m.ym, m])));
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [open, setOpen] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [reserve, setReserve] = useState("");
  const [vals, setVals] = useState<Record<CatId, string>>(() => Object.fromEntries(BUDGET_CATS.map((c) => [c.id, ""])) as Record<CatId, string>);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  // lançamento por dia
  const [day, setDay] = useState<string | null>(null);
  const [cat, setCat] = useState<CatId>("alimentacao");
  const [sub, setSub] = useState<string>(SUBS.alimentacao[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [dayMsg, setDayMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fixed, setFixed] = useState(false);
  const [fixedN, setFixedN] = useState("12");
  const [fixedUnit, setFixedUnit] = useState<"meses" | "anos">("meses");
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const goalBase = useMemo(() => (base ? computeBudget(base).goal : 0), [base]);
  const incomeOf = (ym: string) => entries[ym]?.income ?? base?.income ?? 0;
  const manualOf = (ym: string) => entries[ym]?.actual ?? null;
  // Gastos fixos criam lançamentos nos meses futuros: eles só contam nos números quando o dia chega.
  const done = useMemo(() => expenses.filter((e) => e.day <= curDay), [expenses, curDay]);
  const hasData = (ym: string) => !!entries[ym] || done.some((e) => e.day.startsWith(ym));

  function openMonth(ym: string) {
    const e = entries[ym];
    setOpen(ym); setMsg(""); setDay(null); setDayMsg("");
    setIncome(num(e ? e.income : base?.income ?? 0));
    setReserve(num(e?.reserve ?? null));
    setVals(Object.fromEntries(BUDGET_CATS.map((c) => [c.id, num(e ? e.actual[c.id] : 0)])) as Record<CatId, string>);
  }

  const draft = useMemo(() => {
    const actual = Object.fromEntries(BUDGET_CATS.map((c) => [c.id, parseBRL(vals[c.id])])) as Amounts;
    return { actual, income: parseBRL(income), reserve: reserve.trim() ? parseBRL(reserve) : null };
  }, [vals, income, reserve]);
  const stats = useMemo(() => monthStats(draft.income, open ? combineActual(draft.actual, done, open) : draft.actual), [draft, done, open]);

  async function save() {
    if (!open) return;
    setBusy(true); setMsg("");
    const body = { ym: open, income: draft.income, reserve: draft.reserve, actual: draft.actual };
    const res = await post("/api/budget/months", "PUT", body);
    setBusy(false);
    if (!res.ok) { setMsg(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Não foi possível salvar."); return; }
    setEntries((p) => ({ ...p, [open]: body }));
    setMsg("Mês salvo.");
  }

  async function remove() {
    if (!open || !entries[open] || !confirm("Apagar os valores totais digitados neste mês? Os lançamentos por dia continuam.")) return;
    setBusy(true);
    const res = await post("/api/budget/months", "DELETE", { ym: open });
    setBusy(false);
    if (res.ok) { setEntries((p) => { const n = { ...p }; delete n[open]; return n; }); setMsg("Valores totais apagados."); }
  }

  function pickDay(d: string) {
    setDay(d); setDayMsg(""); setAmount(""); setNote(""); clearFile();
  }
  function pickCat(c: CatId) { setCat(c); setSub(SUBS[c][0]); }
  function clearFile() { setFile(null); if (camRef.current) camRef.current.value = ""; if (fileRef.current) fileRef.current.value = ""; if (pdfRef.current) pdfRef.current.value = ""; }

  /** Reduz fotos grandes do celular (máx. 1600 px, JPEG) para não pesar. PDF segue como está. */
  async function shrink(f: File): Promise<File> {
    if (!f.type.startsWith("image/") || f.type === "image/gif") return f;
    try {
      const bmp = await createImageBitmap(f);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.8));
      return blob ? new File([blob], "comprovante.jpg", { type: "image/jpeg" }) : f;
    } catch { return f; }
  }

  const repeatMonths = fixed ? Math.min(120, Math.max(1, Math.trunc(Number(fixedN)) || 1) * (fixedUnit === "anos" ? 12 : 1)) : 1;
  const monthLabel = (d: string) => `${MONTH_NAMES[Number(d.slice(5, 7)) - 1].toLowerCase()}/${d.slice(0, 4)}`;

  async function addExpense() {
    if (!day) return;
    const v = parseBRL(amount);
    if (v <= 0) { setDayMsg("Informe o valor."); return; }
    if (sub === OTHER_SUB && !note.trim()) { setDayMsg("Em \"Outros\", descreva o gasto no campo ao lado."); return; }
    setBusy(true); setDayMsg("");
    let receiptId: number | null = null;
    if (file) {
      const fd = new FormData();
      fd.append("file", await shrink(file));
      const up = await fetch("/api/budget/receipt", { method: "POST", body: fd });
      const ud = (await up.json().catch(() => null)) as { id?: number; error?: string } | null;
      if (!up.ok || !ud?.id) { setBusy(false); setDayMsg(ud?.error ?? "Não foi possível enviar o comprovante. Tire-o ou lance sem anexo."); return; }
      receiptId = ud.id;
    }
    const res = await post("/api/budget/expenses", "POST", { day, cat, sub, amount: v, note: note.trim(), receiptId, ...(repeatMonths > 1 ? { repeatMonths } : {}) });
    setBusy(false);
    const data = (await res.json().catch(() => null)) as { expenses?: Expense[]; error?: string } | null;
    if (!res.ok || !data?.expenses?.length) { setDayMsg(data?.error ?? "Não foi possível salvar."); return; }
    setExpenses((p) => [...p, ...data.expenses!]);
    setAmount(""); setNote(""); clearFile(); setFixed(false);
    setDayMsg(data.expenses.length > 1 ? `Gasto fixo lançado em ${data.expenses.length} meses (até ${monthLabel(data.expenses[data.expenses.length - 1].day)}).` : "Lançado.");
  }

  async function delExpense(id: number, series = false) {
    const res = await post("/api/budget/expenses", "DELETE", { id, ...(series ? { series: true } : {}) });
    const data = (await res.json().catch(() => null)) as { ids?: number[] } | null;
    if (res.ok && data?.ids) { const gone = new Set(data.ids); setExpenses((p) => p.filter((e) => !gone.has(e.id))); }
  }

  /* ---- calendário de meses e resumo do ano ---- */
  const months = MONTH_NAMES.map((name, i) => {
    const ym = ymOf(year, i);
    const has = hasData(ym);
    const st = has ? monthStats(incomeOf(ym), combineActual(manualOf(ym), done, ym)) : null;
    const sched = expenses.filter((e) => e.day.startsWith(ym) && e.day > curDay).reduce((t, e) => t + e.amount, 0);
    return { name, ym, has, sched, future: ym > curYm, st, reserve: entries[ym]?.reserve ?? null, actual: has ? combineActual(manualOf(ym), done, ym) : null };
  });
  const registered = months.filter((m) => m.has && m.st);
  const yearSpent = registered.reduce((s, m) => s + (m.st!.total - m.actual!.reserva), 0);
  const yearSaved = registered.reduce((s, m) => s + m.actual!.reserva, 0);
  const withReserve = months.filter((m) => m.reserve != null);
  const lastReg = [...registered].reverse()[0];
  const lastCalc = lastReg ? computeBudget({ income: incomeOf(lastReg.ym), actual: lastReg.actual!, reserveNow: 0 }) : null;
  const goal = lastCalc && !lastCalc.usedIdealEssentials ? lastCalc.goal : goalBase;
  const maxRes = Math.max(goal, ...withReserve.map((m) => m.reserve ?? 0), 1);

  /* ---- dias do mês aberto ---- */
  const openYear = open ? Number(open.slice(0, 4)) : year;
  const openMi = open ? Number(open.slice(5)) - 1 : 0;
  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.day, (m.get(e.day) ?? 0) + e.amount);
    return m;
  }, [expenses]);
  const dayList = day ? expenses.filter((e) => e.day === day) : [];
  const firstWeekday = open ? new Date(openYear, openMi, 1).getDay() : 0;
  const field = "input w-full";

  /* ---- dashboard anual ---- */
  const monthsForRank: MonthEntry[] = months.filter((m) => m.has).map((m) => entries[m.ym] ?? { ym: m.ym, income: incomeOf(m.ym), actual: BUDGET_CATS.reduce((a, c) => ({ ...a, [c.id]: 0 }), {} as Amounts), reserve: null });
  const rank = useMemo(() => rankSpending(done, monthsForRank, year), [done, monthsForRank, year]);
  const catTotals = BUDGET_CATS.map((c) => {
    const total = months.reduce((s, m) => s + (m.actual ? m.actual[c.id] : 0), 0);
    const idealYear = months.reduce((s, m) => s + (m.has ? idealAmounts(incomeOf(m.ym))[c.id] : 0), 0);
    return { id: c.id, label: c.label, total, idealYear };
  });
  const maxRank = Math.max(...rank.items.map((r) => r.total), 1);
  const maxMonth = Math.max(...months.map((m) => (m.actual ? m.st!.total - m.actual.reserva : 0)), 1);
  const top = rank.items[0];

  return (
    <>
      <section className="card p-4 md:p-5" id="acompanhamento">
        <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-bold text-gold-soft">3. Acompanhamento mês a mês e dia a dia</h2><button type="button" className="btn btn-ghost !px-3 !py-1 text-xs" onClick={toggle} aria-pressed={hidden}>{hidden ? "👁 Mostrar valores" : "🙈 Ocultar valores"}</button></div>
        <p className="mt-1 text-sm text-muted">Toque em um mês e depois em um dia para lançar cada gasto (mercado, aluguel, combustível…). Tudo se soma no mês e alimenta o ranking do ano.</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => { setYear(year - 1); setOpen(null); setDay(null); }} aria-label="Ano anterior">‹</button>
          <span className="font-display text-lg font-bold">{year}</span>
          <button type="button" className="btn btn-ghost !px-3 !py-1.5" onClick={() => { setYear(year + 1); setOpen(null); setDay(null); }} aria-label="Próximo ano">›</button>
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
                    {st.sobra < 0 && <div className="text-[11px] text-down">falta {brl(-st.sobra)}</div>}
                  </>
                ) : <div className="mt-1 text-[11px]">{m.future ? (m.sched > 0 ? `🔁 ${brl(m.sched)}` : "—") : "registrar"}</div>}
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
            <h3 className="font-display text-base font-bold text-gold-soft">{MONTH_NAMES[openMi]} de {openYear}</h3>

            <h4 className="mt-3 text-sm font-semibold">Dia a dia</h4>
            <p className="text-xs text-muted">Toque no dia para lançar os gastos dele. O número mostra o total do dia.</p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: daysInMonth(openYear, openMi) }).map((_, i) => {
                const d = dayOf(open, i + 1);
                const t = dayTotals.get(d) ?? 0;
                const fut = d > curDay;
                return (
                  <button key={d} type="button" disabled={fut} onClick={() => pickDay(d)} aria-pressed={day === d}
                    className={`rounded-lg border p-1 text-center ${day === d ? "border-gold bg-panel-2" : t > 0 ? "border-gold/40" : "border-line"} ${fut ? "opacity-30" : "hover:bg-panel-2"} ${d === curDay ? "ring-1 ring-gold/60" : ""}`}>
                    <div className="text-xs font-semibold">{i + 1}</div>
                    <div className={`h-3 truncate text-[9px] ${t > 0 ? "text-gold-soft" : "text-transparent"}`}>{t > 0 ? brl(t) : "·"}</div>
                  </button>
                );
              })}
            </div>

            {day && (
              <div className="mt-4 rounded-lg border border-line p-3">
                <h5 className="text-sm font-bold">Dia {Number(day.slice(8))} de {MONTH_NAMES[openMi].toLowerCase()}</h5>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="block text-xs text-muted">Categoria
                    <select className={`${field} mt-1 w-full`} value={cat} onChange={(e) => pickCat(e.target.value as CatId)}>
                      {BUDGET_CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-muted">Gasto específico
                    <select className={`${field} mt-1 w-full`} value={sub} onChange={(e) => setSub(e.target.value)}>
                      {SUBS[cat].map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-muted">Valor (R$)
                    <input className={`${field} mt-1 w-full`} style={maskStyle(hidden)} inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </label>
                  <label className="block text-xs text-muted">{sub === OTHER_SUB ? "Descreva o gasto (obrigatório)" : "Observação (opcional)"}
                    <input className={`${field} mt-1 w-full`} maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
                  </label>
                </div>
                <div className="mt-3 rounded-lg border border-line p-3">
                  <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} className="h-4 w-4 accent-[#d9b45a]" /> 🔁 Gasto fixo (repete todo mês)</label>
                  {fixed && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block text-xs text-muted">Por quanto tempo
                          <input className={`${field} mt-1 w-full`} inputMode="numeric" value={fixedN} onChange={(e) => setFixedN(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                        </label>
                        <label className="block text-xs text-muted">Período
                          <select className={`${field} mt-1 w-full`} value={fixedUnit} onChange={(e) => setFixedUnit(e.target.value as "meses" | "anos")}>
                            <option value="meses">meses</option>
                            <option value="anos">anos</option>
                          </select>
                        </label>
                      </div>
                      {day && <p className="text-xs text-muted">Será lançado no dia {Number(day.slice(8))} de cada mês, de {monthLabel(day)} até {monthLabel(repeatDays(day, repeatMonths).at(-1)!)} ({repeatMonths} {repeatMonths === 1 ? "mês" : "meses"}). Em meses mais curtos usa o último dia. Os meses futuros entram nos totais quando chegar o dia. O anexo fica só no primeiro lançamento.</p>}
                    </div>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <button type="button" className="btn" onClick={() => camRef.current?.click()}>📷 Tirar foto</button>
                    <button type="button" className="btn" onClick={() => fileRef.current?.click()}>📎 Anexar comprovante</button>
                    <button type="button" className="btn" onClick={() => pdfRef.current?.click()}>📄 Anexar boleto (PDF)</button>
                    <span className="text-muted">(opcional)</span>
                  </div>
                  <button type="button" className="btn btn-gold w-full" onClick={addExpense} disabled={busy}>{busy ? "Salvando..." : "Lançar"}</button>
                </div>
                {file && <p className="mt-1 text-xs text-muted">Anexo: <span className="text-gold-soft">{file.name}</span> <button type="button" className="ml-1 text-down underline" onClick={clearFile}>remover</button></p>}
                {dayMsg && <p className="mt-1 text-xs text-muted" role="status">{dayMsg}</p>}
                {dayList.length > 0 ? (
                  <ul className="mt-3 divide-y divide-line/50 text-sm">
                    {dayList.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLORS[e.cat] }} /><span className="truncate">{e.seriesId ? "🔁 " : ""}{expenseLabel(e)}{e.sub !== OTHER_SUB && e.note ? <span className="text-muted"> · {e.note}</span> : null}</span></span>
                        <span className="flex shrink-0 items-center gap-2"><span className="font-semibold">{brl2(e.amount)}</span>{e.receiptId ? <a className="text-xs text-gold-soft underline" href={`/api/budget/receipt?id=${e.receiptId}`} target="_blank" rel="noopener noreferrer">📎 comprovante/boleto</a> : null}<button type="button" className="text-xs text-down underline" onClick={() => delExpense(e.id)}>apagar</button>{e.seriesId ? <button type="button" className="text-xs text-down underline" onClick={() => { if (window.confirm("Apagar este gasto fixo e os dos próximos meses?")) delExpense(e.id, true); }}>apagar este e os próximos</button> : null}</span>
                      </li>
                    ))}
                    <li className="flex justify-between pt-1.5 text-sm font-bold"><span>Total do dia</span><span>{brl2(dayList.reduce((s, e) => s + e.amount, 0))}</span></li>
                  </ul>
                ) : <p className="mt-3 text-xs text-muted">Nenhum lançamento neste dia ainda.</p>}
              </div>
            )}

            <h4 className="mt-5 text-sm font-semibold">Resumo do mês por categoria</h4>
            <div className="mt-2 overflow-x-auto">
              <table className="data w-full text-sm">
                <thead><tr><th>Categoria</th><th className="num">Ideal</th><th className="num">Realizado</th><th className="num">Diferença</th></tr></thead>
                <tbody>
                  {stats.rows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[r.id] }} />{r.label}</td>
                      <td className="num">{draft.income > 0 ? brl(r.ideal) : "—"}</td>
                      <td className="num">{brl(r.real)}</td>
                      <td className={`num ${draft.income > 0 && r.real > 0 ? (r.bad ? "text-down" : "text-up") : "text-muted"}`}>{draft.income > 0 && r.real > 0 ? `${r.diff > 0 ? "+" : ""}${brl(r.diff)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {draft.income > 0 && stats.total > 0 && (
              <p className={`mt-2 text-sm ${stats.sobra < 0 ? "text-down" : "text-muted"}`}>
                Total do mês: {brl(stats.total)}. {stats.sobra < 0 ? `Você gastou ${brl(-stats.sobra)} a mais do que ganhou.` : stats.sobra === 0 ? "Toda a renda teve destino." : `Sobraram ${brl(stats.sobra)}.`}
                {stats.overspent > 0 ? ` Nas categorias de gasto, passou ${brl(stats.overspent)} do ideal.` : ""}
              </p>
            )}

            <details className="mt-4 rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold">Renda do mês, reserva e valores totais sem detalhar</summary>
              <p className="mt-1 text-xs text-muted">Use para informar a renda do mês e o saldo da reserva. Se preferir, também dá para digitar o total de uma categoria sem lançar dia a dia: ele soma com os lançamentos diários.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block"><span className="text-sm font-semibold">Renda do mês</span><input className={field} style={maskStyle(hidden)} inputMode="decimal" placeholder="R$" value={income} onChange={(e) => setIncome(e.target.value)} /></label>
                <label className="block"><span className="text-sm font-semibold">Saldo da reserva de emergência no fim do mês</span><input className={field} style={maskStyle(hidden)} inputMode="decimal" placeholder="R$ (opcional)" value={reserve} onChange={(e) => setReserve(e.target.value)} /></label>
                {BUDGET_CATS.map((c) => (
                  <label key={c.id} className="block"><span className="text-sm font-semibold">{c.label} (total sem detalhar)</span><input className={field} style={maskStyle(hidden)} inputMode="decimal" placeholder="R$ no mês" value={vals[c.id]} onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })} /></label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar mês"}</button>
                {entries[open] && <button type="button" className="btn btn-ghost !text-down" onClick={remove} disabled={busy}>Apagar valores totais</button>}
                {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
              </div>
            </details>
            <button type="button" className="btn btn-ghost mt-3" onClick={() => { setOpen(null); setDay(null); }}>Fechar mês</button>
          </div>
        )}

        {withReserve.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-base font-bold text-gold-soft">Evolução da reserva em {year}</h3>
            <p className="text-xs text-muted">Saldo no fim de cada mês{goal > 0 ? ` e meta de 12 meses (${brl(goal)})` : ""}.</p>
            <div className="relative mt-3 flex h-36 items-end gap-1.5 border-b border-line">
              {goal > 0 && <div className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-gold/70" style={{ bottom: `${(goal / maxRes) * 100}%` }} />}
              {months.map((m) => (
                <div key={m.ym} className="flex h-full flex-1 flex-col items-center justify-end">
                  {m.reserve !== null && <div className="w-full rounded-t bg-cyan-500/80" style={{ height: `${(m.reserve / maxRes) * 100}%` }} title={`${m.name}: ${brl(m.reserve)}`} />}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1.5 text-center text-[10px] text-muted">{months.map((m) => <span key={m.ym} className="flex-1">{m.name.slice(0, 1)}</span>)}</div>
          </div>
        )}
      </section>

      <section className="card p-4 md:p-5" id="dashboard">
        <h2 className="font-display text-lg font-bold text-gold-soft">4. Dashboard de {year}: por onde o dinheiro está vazando</h2>
        {rank.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Lance seus gastos dia a dia (ou os totais do mês) para ver o ranking dos 10 maiores gastos do ano.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              Em {year} você registrou {brl(rank.totalSpend)} em gastos (sem contar o que guardou).{top ? ` O maior é ${top.label}: ${brl(top.total)}, ${top.pctSpend.toFixed(0)}% de tudo${top.pctIncome !== null ? ` e ${top.pctIncome.toFixed(0)}% da sua renda` : ""}.` : ""}
            </p>
            <h3 className="mt-4 text-sm font-semibold">Ranking dos 10 maiores gastos</h3>
            <ol className="mt-2 space-y-2">
              {rank.items.map((r, i) => (
                <li key={`${r.cat}${r.label}`} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2"><span className={`w-6 shrink-0 text-right font-bold ${i < 3 ? "text-down" : "text-muted"}`}>{i + 1}º</span><span className="truncate">{r.label}</span><span className="hidden text-xs text-muted sm:inline">· {catLabel(r.cat)}</span></span>
                    <span className="shrink-0 font-semibold">{brl(r.total)} <span className="text-xs font-normal text-muted">({r.pctSpend.toFixed(0)}%)</span></span>
                  </div>
                  <div className="ml-8 mt-1 h-2 overflow-hidden rounded bg-panel-2"><div className="h-full rounded" style={{ width: `${(r.total / maxRank) * 100}%`, background: i < 3 ? "#f87171" : COLORS[r.cat] }} /></div>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">Os 3 primeiros (em vermelho) são onde um corte pequeno mais faz diferença.</p>

            <h3 className="mt-5 text-sm font-semibold">Ano por categoria: realizado x ideal</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="data w-full text-sm">
                <thead><tr><th>Categoria</th><th className="num">Ideal no ano</th><th className="num">Realizado</th><th className="num">Diferença</th></tr></thead>
                <tbody>
                  {catTotals.map((c) => {
                    const diff = c.total - c.idealYear;
                    const bad = c.id === "reserva" ? diff < 0 : diff > 0;
                    return (
                      <tr key={c.id}>
                        <td><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[c.id] }} />{c.label}</td>
                        <td className="num">{brl(c.idealYear)}</td><td className="num">{brl(c.total)}</td>
                        <td className={`num ${c.total > 0 ? (bad ? "text-down" : "text-up") : "text-muted"}`}>{c.total > 0 ? `${diff > 0 ? "+" : ""}${brl(diff)}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="mt-5 text-sm font-semibold">Gasto mês a mês <span className="font-normal text-muted">(valor em R$ sobre cada barra)</span></h3>
            <div className="mt-2 flex h-40 items-end gap-1.5 border-b border-line">
              {months.map((m) => {
                const v = m.actual ? m.st!.total - m.actual.reserva : 0;
                return (
                  <div key={m.ym} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    {v > 0 && <span className="mb-0.5 whitespace-nowrap text-[9px] font-semibold text-gold-soft" title={`${m.name}: ${brl2(v)}`}>{hidden ? "••" : compactBRL(v)}</span>}
                    {v > 0 && <div className="w-full rounded-t bg-gold/70" style={{ height: `${(v / maxMonth) * 78}%` }} />}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex gap-1.5 text-center text-[10px] text-muted">{months.map((m) => <span key={m.ym} className="flex-1">{m.name.slice(0, 1)}</span>)}</div>
          </>
        )}
      </section>
    </>
  );
}
