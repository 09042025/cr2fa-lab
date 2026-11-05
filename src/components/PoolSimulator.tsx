"use client";
import { useMemo, useState } from "react";
import { earnings, impermanentLoss, presetRange, split } from "@/lib/clsim";

interface Props {
  symA: string; symB: string; price: number | null; usdA: number | null; usdB: number | null;
  baseApr: number | null; stable: boolean; priceNote: string | null; dexName: string; dexUrl: string;
}
const num = (s: string) => { const v = Number(s.replace(",", ".")); return Number.isFinite(v) ? v : NaN; };
const fmt = (v: number, d = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const usd = (v: number) => `US$ ${fmt(v)}`;
const sig = (v: number) => v.toLocaleString("pt-BR", { maximumSignificantDigits: 6 });

export function PoolSimulator({ symA, symB, price, usdA, usdB, baseApr, stable, priceNote, dexName, dexUrl }: Props) {
  const [manual, setManual] = useState("");
  const p = price ?? num(manual);
  const [rangeKind, setRangeKind] = useState<"narrow" | "wide" | "full" | "custom">("wide");
  const [minS, setMinS] = useState(""); const [maxS, setMaxS] = useState("");
  const [valueS, setValueS] = useState("1000");
  const [showIl, setShowIl] = useState(false);
  const [mode, setMode] = useState<"pct" | "price">("pct");

  const [pa, pb] = useMemo<[number, number]>(() => {
    if (!(p > 0)) return [0, Infinity];
    if (rangeKind === "custom") { const a = num(minS), b = num(maxS); return [Number.isFinite(a) && a >= 0 ? a : 0, Number.isFinite(b) && b > 0 ? b : Infinity]; }
    return presetRange(p, rangeKind, stable);
  }, [p, rangeKind, minS, maxS, stable]);
  const value = num(valueS);
  const valid = p > 0 && pb > pa && value > 0;
  const e = valid ? earnings(value, p, pa, pb, baseApr) : null;
  const sp = valid ? split(p, pa, pb) : null;
  const pickRange = (k: "narrow" | "wide" | "full") => setRangeKind(k);
  const show = (v: number) => (mode === "pct" ? (v === 0 ? "-100" : Number.isFinite(v) ? fmt((v / p - 1) * 100, 2) : "∞") : Number.isFinite(v) ? sig(v) : "∞");
  const setBounds = (lo: number, hi: number) => { setRangeKind("custom"); setMinS(String(lo)); setMaxS(Number.isFinite(hi) ? String(hi) : ""); };
  const commit = (k: "min" | "max", raw: string) => {
    const t = raw.trim();
    if (t === "∞" || t === "") { if (k === "max") setBounds(pa, Infinity); return; }
    const n = num(t);
    if (!Number.isFinite(n)) return;
    const v = mode === "pct" ? p * (1 + n / 100) : n;
    if (k === "min") setBounds(Math.max(0, v), pb); else setBounds(pa, v);
  };
  const step = (k: "min" | "max", dir: 1 | -1) => {
    const d = p * (stable ? 0.001 : 0.01) * dir;
    if (k === "min") setBounds(Math.max(0, pa + d), pb); else setBounds(pa, Number.isFinite(pb) ? pb + d : p * 2);
  };
  const btn = (on: boolean) => `btn ${on ? "btn-gold" : "btn-ghost"}`;
  const pctFromP = (v: number) => (p > 0 && Number.isFinite(v) ? `${(v / p - 1) * 100 >= 0 ? "+" : ""}${fmt((v / p - 1) * 100, 1)}%` : "—");

  return (
    <section className="card p-4">
      <h2 className="mb-1 font-semibold">Simulação de taxas</h2>
      <p className="mb-3 text-xs text-muted">Escolha a faixa de preço e o valor. Faixa mais estreita rende mais taxas enquanto o preço fica dentro dela, mas sai de campo com mais facilidade.</p>

      {price === null && (
        <div className="mb-3">
          {priceNote && <p className="mb-2 text-xs text-gold-soft">{priceNote}</p>}
          <label className="label" htmlFor="pmanual">Preço atual ({symB} por {symA})</label>
          <input id="pmanual" className="input" inputMode="decimal" value={manual} onChange={(ev) => setManual(ev.target.value)} placeholder="ex.: 182,82" />
        </div>
      )}
      {p > 0 && <p className="mb-3 text-sm">Preço atual: <b>{sig(p)}</b> <span className="text-muted">{symB} por {symA}</span></p>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btn(rangeKind === "narrow")} onClick={() => pickRange("narrow")} disabled={!(p > 0)}>Faixa estreita</button>
        <button type="button" className={btn(rangeKind === "wide")} onClick={() => pickRange("wide")} disabled={!(p > 0)}>Faixa larga</button>
        <button type="button" className={btn(rangeKind === "full")} onClick={() => pickRange("full")} disabled={!(p > 0)}>Faixa total</button>
        <button type="button" className="btn btn-ghost ml-auto" onClick={() => pickRange("wide")} disabled={!(p > 0)}>Redefinir</button>
        <span className="inline-flex overflow-hidden rounded-lg border border-line text-sm">
          <button type="button" className={`px-3 py-2 ${mode === "pct" ? "bg-gold text-ink" : ""}`} onClick={() => setMode("pct")} title="Mostrar a faixa em % do preço atual">%</button>
          <button type="button" className={`px-3 py-2 ${mode === "price" ? "bg-gold text-ink" : ""}`} onClick={() => setMode("price")} title="Mostrar a faixa em preço">#</button>
        </span>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        {([["min", "Preço mínimo", pa], ["max", "Preço máximo", pb]] as const).map(([k, label, v]) => (
          <div key={k}>
            <label className="label" htmlFor={`p${k}`}>{label}</label>
            <div className="flex items-center gap-1">
              <button type="button" className="btn btn-ghost px-3" aria-label={`Diminuir ${label}`} onClick={() => step(k, -1)} disabled={!(p > 0)}>−</button>
              <input key={`${k}-${mode}-${v}`} id={`p${k}`} className="input min-w-0 flex-1 text-center" inputMode="decimal" defaultValue={show(v)} onBlur={(ev) => commit(k, ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }} />
              <button type="button" className="btn btn-ghost px-3" aria-label={`Aumentar ${label}`} onClick={() => step(k, 1)} disabled={!(p > 0)}>+</button>
            </div>
            <p className="mt-1 text-xs text-muted">{mode === "pct" ? `% · ${symB} por ${symA}: ${Number.isFinite(v) ? sig(v) : "∞"}` : `${symB} por ${symA}${p > 0 && Number.isFinite(v) ? ` · ${pctFromP(v)}` : ""}`}</p>
          </div>
        ))}
        <div>
          <label className="label" htmlFor="pval">Valor a colocar (US$)</label>
          <input id="pval" className="input" inputMode="decimal" value={valueS} onChange={(ev) => setValueS(ev.target.value)} />
        </div>
      </div>

      {valid && e && (
        <>
          {p > 0 && pb > pa && Number.isFinite(pb) && (
            <div className="mb-3">
              <div className="relative h-2 rounded bg-line">
                {(() => {
                  const lo = Math.min(pa || p * 0.5, p) * 0.9, hi = Math.max(pb, p) * 1.1, w = hi - lo;
                  const x = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / w) * 100))}%`;
                  return <><div className="absolute top-0 h-2 rounded bg-gold" style={{ left: x(pa || lo), width: `calc(${x(pb)} - ${x(pa || lo)})` }} /><div className="absolute -top-1 h-4 w-0.5 bg-white" style={{ left: x(p) }} title="Preço atual" /></>;
                })()}
              </div>
              <p className="mt-1 text-xs text-muted">Barra dourada = sua faixa; linha branca = preço atual.{!e.inRange && " O preço atual está fora da faixa: nesta faixa não há ganho de taxas."}</p>
            </div>
          )}
          {sp && (
            <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
              {([[symA, sp.fracA, usdA], [symB, sp.fracB, usdB]] as const).map(([s, f, u]) => (
                <div key={s} className="rounded-lg border border-line p-3">
                  <p className="text-xs text-muted">{s}</p>
                  <p className="font-semibold">{usd(value * f)} <span className="text-xs font-normal text-muted">({fmt(f * 100, 1)}%)</span></p>
                  {u ? <p className="text-xs text-muted">{sig((value * f) / u)} {s}</p> : null}
                </div>
              ))}
            </div>
          )}
          <div className="rounded-lg border border-gold/40 bg-gold/10 p-3">
            <p className="text-xs text-gold-soft">Ganho estimado em taxas</p>
            {e.year === null ? <p className="text-sm text-muted">Sem dados de volume para estimar este pool.</p> : (
              <div className="mt-1 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-muted">24 horas</p><p className="font-semibold">{usd(e.day!)}</p></div>
                <div><p className="text-xs text-muted">Mensal</p><p className="font-semibold">{usd(e.month!)}</p></div>
                <div><p className="text-xs text-muted">Anual (APR {fmt(e.apr!, 1)}%)</p><p className="font-semibold">{usd(e.year!)}</p></div>
              </div>
            )}
          </div>
          <button type="button" className="mt-3 block text-sm font-semibold text-gold-soft underline" onClick={() => setShowIl((v) => !v)}>{showIl ? "Ocultar" : "Ver"} simulação de perda impermanente</button>
          {showIl && (
            <div className="mt-2 overflow-x-auto">
              <table className="data"><thead><tr><th>Se {symA} variar</th><th className="num">Perda vs. segurar</th></tr></thead>
                <tbody>{[-0.5, -0.2, -0.1, 0.1, 0.2, 0.5, 1].map((c) => { const il = impermanentLoss(p, pa, pb, c); return <tr key={c}><td>{c > 0 ? "+" : ""}{c * 100}%</td><td className="num">{il === null ? "—" : `${fmt(il, 2)}%`}</td></tr>; })}</tbody></table>
            </div>
          )}
        </>
      )}
      {!valid && p > 0 && <p className="text-sm text-muted">Informe uma faixa válida (máximo maior que o mínimo) e um valor maior que zero.</p>}

      <a href={dexUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-gold mt-4 inline-flex">Abrir na {dexName} ↗</a>
      <p className="mt-2 text-xs text-muted">Estimativa baseada no volume e no TVL de hoje; o ganho real muda todo dia e a perda impermanente pode superar as taxas. Confira o endereço do site e os tokens antes de conectar a carteira.</p>
    </section>
  );
}
