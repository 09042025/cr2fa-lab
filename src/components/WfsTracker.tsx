"use client";
import { useRef, useState } from "react";
import { CYCLE } from "@/lib/wfs-content";
import { PillIcon, StepBody } from "./WfsBits";
import type { Step } from "@/lib/wfs-steps";
import type { WfsProgress } from "@/lib/wfs";

const PHASE_NAME = { blue: "BLUE PILL", red: "RED PILL", black: "BLACK PILL", white: "WHITE PILL" } as const;
const TONE: Record<string, string> = { blue: "#6fb7ff", red: "#ff7b7b", black: "#c9c9d6", white: "#ffffff" };

/** Acompanhamento da jornada de 12 semanas e do ciclo (etapa atual e voltas completas). Salva sozinho. */
export function WfsTracker({ initial, steps }: { initial: WfsProgress; steps: Step[] }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState("");
  const [openN, setOpenN] = useState<number | null>(null);
  const seq = useRef(0);

  async function save(next: WfsProgress) {
    setP(next); setMsg("");
    const n = ++seq.current;
    const res = await fetch("/api/wfs/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) }).catch(() => null);
    if (n === seq.current && !res?.ok) setMsg("Não foi possível salvar agora. Tente de novo.");
  }
  const toggleWeek = (n: number) => save({ ...p, weeks: p.weeks.includes(n) ? p.weeks.filter((x) => x !== n) : [...p.weeks, n] });
  const advance = () => (p.stage >= 6 ? save({ ...p, stage: 1, laps: p.laps + 1 }) : save({ ...p, stage: p.stage + 1 }));
  const back = () => save({ ...p, stage: Math.max(1, p.stage - 1) });
  const cur = CYCLE[p.stage - 1];
  const pct = Math.round((p.weeks.length / 12) * 100);
  const openStep = steps.find((x) => x.n === openN) ?? null;

  return (
    <div className="wfm-body" style={{ maxWidth: "46rem" }}>
      <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)" }}>Seu ciclo agora</h2>
      <div className="wfm-quote" style={{ textAlign: "center" }}>
        <div className="wfm-cin text-xs tracking-[0.3em] text-[#c7a24a]">ETAPA {p.stage} DE 6 · {p.laps} {p.laps === 1 ? "VOLTA COMPLETA" : "VOLTAS COMPLETAS"}</div>
        <div className="wfm-goth" style={{ fontSize: "2.2rem", margin: "0.2em 0", color: "#f6e6b4" }}>{cur.name}</div>
        <p style={{ fontFamily: "EB Garamond, serif", fontWeight: 400, letterSpacing: 0, fontSize: "1.1rem", margin: "0 0 0.8em" }}>{cur.how}</p>
        <div className="flex justify-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={back} disabled={p.stage === 1}>‹ Voltar etapa</button>
          <button type="button" className="btn btn-gold" onClick={advance}>{p.stage === 6 ? "Concluir a volta ✦" : "Concluí esta etapa ›"}</button>
        </div>
      </div>

      <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)", marginTop: "2rem" }}>Jornada de 12 meses</h2>
      {openStep ? (
        <div>
          <button type="button" className="btn btn-ghost" onClick={() => setOpenN(null)}>‹ Voltar aos 12 meses</button>
          <div className="mt-3 flex items-center gap-3">
            <PillIcon phase={openStep.phase} size={64} />
            <div>
              <div className="wfm-cin text-xs tracking-[0.25em] text-[#c7a24a]">MÊS {String(openStep.n).padStart(2, "0")} · {PHASE_NAME[openStep.phase]}</div>
              <div className="wfm-goth" style={{ fontSize: "1.9rem", color: "#fff" }}>{openStep.title}</div>
              <div style={{ fontStyle: "italic", color: "#f1e3b4" }}>{openStep.sub}</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[#c7a24a]/40 bg-black/50"><StepBody s={openStep} /></div>
          <div className="mt-4 text-center">
            <button type="button" className="btn btn-gold" onClick={() => { toggleWeek(openStep.n); setOpenN(null); }}>
              {p.weeks.includes(openStep.n) ? "Reabrir este mês" : "✓ Concluir este mês"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-center" style={{ fontSize: "1rem" }}>{p.weeks.length} de 12 meses concluídos ({pct}%). Toque em um mês para ver tudo o que estudar e concluir lá dentro. A jornada continua depois do último mês.</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-[#d9b45a]" style={{ width: `${pct}%` }} /></div>
          <ul className="mt-4 space-y-2" style={{ listStyle: "none", padding: 0 }}>
            {steps.map((w) => {
              const done = p.weeks.includes(w.n);
              return (
                <li key={w.n}>
                  <button type="button" onClick={() => setOpenN(w.n)} className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left" style={{ borderColor: done ? "rgba(217,180,90,0.7)" : "rgba(255,255,255,0.12)", background: done ? "rgba(217,180,90,0.08)" : "rgba(0,0,0,0.4)" }}>
                    <PillIcon phase={w.phase} />
                    <span className="min-w-0 flex-1">
                      <span className="wfm-cin block text-[11px] tracking-[0.2em]" style={{ color: TONE[w.phase] }}>MÊS {String(w.n).padStart(2, "0")} · {PHASE_NAME[w.phase]}</span>
                      <span style={{ fontSize: "1.15rem", opacity: done ? 0.75 : 1 }}>{w.title}</span>
                    </span>
                    {done ? <span className="wfm-cin shrink-0 text-xs text-[#d9b45a]">✓ CONCLUÍDO</span> : <span aria-hidden className="shrink-0 text-[#d9b45a]">›</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {msg && <p role="alert" className="mt-2 text-center text-sm text-down">{msg}</p>}
    </div>
  );
}
