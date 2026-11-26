"use client";
import { useRef, useState } from "react";
import { CYCLE, WEEKS } from "@/lib/wfs-content";
import type { WfsProgress } from "@/lib/wfs";

const TONE: Record<string, string> = { blue: "#6fb7ff", red: "#ff7b7b", black: "#c9c9d6", white: "#ffffff" };

/** Acompanhamento da jornada de 12 semanas e do ciclo (etapa atual e voltas completas). Salva sozinho. */
export function WfsTracker({ initial }: { initial: WfsProgress }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState("");
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

      <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)", marginTop: "2rem" }}>Jornada de 12 semanas</h2>
      <p className="text-center" style={{ fontSize: "1rem" }}>{p.weeks.length} de 12 módulos concluídos ({pct}%). A jornada continua depois do último módulo.</p>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-[#d9b45a]" style={{ width: `${pct}%` }} /></div>
      <ul className="mt-4 space-y-1" style={{ listStyle: "none", padding: 0 }}>
        {WEEKS.map((w) => {
          const done = p.weeks.includes(w.n);
          return (
            <li key={w.n}>
              <button type="button" onClick={() => toggleWeek(w.n)} aria-pressed={done} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-left">
                <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm" style={{ borderColor: TONE[w.tone], color: TONE[w.tone], background: done ? "rgba(217,180,90,0.25)" : "transparent" }}>{done ? "✓" : ""}</span>
                <span style={{ fontSize: "1.1rem", opacity: done ? 0.7 : 1 }}>Semana {String(w.n).padStart(2, "0")} — {w.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {msg && <p role="alert" className="mt-2 text-center text-sm text-down">{msg}</p>}
    </div>
  );
}
