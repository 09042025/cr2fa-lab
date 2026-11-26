"use client";
import { useState } from "react";
import { RADAR_DIMS, RADAR_SCALE } from "@/lib/wfs-doctrine";
import type { RadarEntry } from "@/lib/wfs";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const label = (ym: string) => `${MONTHS[Number(ym.slice(5)) - 1]}/${ym.slice(2, 4)}`;
const levelOf = (n: number) => RADAR_SCALE[n <= 2 ? 0 : n <= 4 ? 1 : n <= 6 ? 2 : n <= 8 ? 3 : 4];

/** Radar de autoavaliação: 10 competências de 0 a 10, índice de 0 a 100, histórico por mês. */
export function WfsRadar({ history }: { history: RadarEntry[] }) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const current = history.find((h) => h.ym === ym);
  const previous = history.find((h) => h.ym !== ym);
  const [hist, setHist] = useState(history);
  const [scores, setScores] = useState<number[]>(current?.scores ?? previous?.scores ?? Array(10).fill(5));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const total = scores.reduce((a, b) => a + b, 0);
  const prev = hist.find((h) => h.ym !== ym);

  const C = 150, R = 100;
  const pt = (i: number, v: number) => { const a = (-90 + (360 / 10) * i) * (Math.PI / 180); return [C + Math.cos(a) * R * (v / 10), C + Math.sin(a) * R * (v / 10)] as const; };
  const poly = (arr: number[]) => arr.map((v, i) => pt(i, v).join(",")).join(" ");
  const rings = [2, 4, 6, 8, 10].map((r) => RADAR_DIMS.map((_, i) => pt(i, r).join(",")).join(" "));

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/wfs/radar", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ym, scores }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setMsg("Não foi possível salvar agora."); return; }
    setHist((h) => [{ ym, scores }, ...h.filter((x) => x.ym !== ym)].sort((a, b) => b.ym.localeCompare(a.ym)));
    setMsg("Avaliação do mês salva.");
  }
  async function copy() {
    const text = `White Flame Radar — ${label(ym)}\n${RADAR_DIMS.map((d, i) => `${d.key}: ${scores[i]}/10`).join("\n")}\nÍndice pessoal: ${total} de 100`;
    try { await navigator.clipboard.writeText(text); setMsg("Avaliação copiada."); } catch { setMsg("Não foi possível copiar neste aparelho."); }
  }

  return (
    <div className="wfm-body" style={{ maxWidth: "46rem" }}>
      <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-sm" role="img" aria-label={`Radar de evolução pessoal, índice ${total} de 100`}>
        {rings.map((r, i) => <polygon key={i} points={r} fill="none" stroke="rgba(199,162,74,0.25)" />)}
        {RADAR_DIMS.map((_, i) => { const [x, y] = pt(i, 10); return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="rgba(199,162,74,0.2)" />; })}
        {prev && <polygon points={poly(prev.scores)} fill="none" stroke="rgba(255,255,255,0.55)" strokeDasharray="4 3" />}
        <polygon points={poly(scores)} fill="rgba(217,180,90,0.28)" stroke="#d9b45a" strokeWidth="2" />
        {scores.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="3.5" fill="#d9b45a" />; })}
        {RADAR_DIMS.map((d, i) => { const [x, y] = pt(i, 12.3); return <text key={d.key} x={x} y={y} textAnchor={x < C - 8 ? "end" : x > C + 8 ? "start" : "middle"} dominantBaseline="middle" fontSize="9" fill="#e8dcc0">{d.short}</text>; })}
      </svg>
      {prev && <p className="text-center" style={{ fontSize: "0.9rem", opacity: 0.75 }}>Linha tracejada: sua avaliação de {label(prev.ym)}.</p>}

      <div className="mt-4 space-y-4">
        {RADAR_DIMS.map((d, i) => (
          <label key={d.key} className="block">
            <span className="flex items-baseline justify-between" style={{ fontSize: "1.1rem" }}><span>{d.key}</span><span className="wfm-cin text-[#e3c36a]">{scores[i]}/10</span></span>
            <input type="range" min={0} max={10} step={1} value={scores[i]} className="w-full accent-[#d9b45a]" aria-label={d.key}
              onChange={(e) => setScores((s) => s.map((v, j) => (j === i ? Number(e.target.value) : v)))} />
            <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{levelOf(scores[i])[1]}</span>
          </label>
        ))}
      </div>

      <div className="wfm-quote" style={{ textAlign: "center" }}>
        <div className="wfm-cin text-xs tracking-[0.3em] text-[#c7a24a]">ÍNDICE PESSOAL DE AUTOAVALIAÇÃO</div>
        <div className="wfm-goth" style={{ fontSize: "3rem", color: "#f6e6b4" }}>{total} <span className="wfm-cin text-sm">DE 100</span></div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "Salvando..." : `Salvar avaliação de ${label(ym)}`}</button>
        <button type="button" className="btn btn-ghost" onClick={copy}>Copiar avaliação</button>
      </div>
      {msg && <p role="status" className="mt-2 text-center text-sm">{msg}</p>}

      {hist.length > 0 && (
        <>
          <h2 className="wfm-h2 wfm-silver">Sua evolução</h2>
          <table className="wfm-table"><thead><tr><th>Mês</th><th>Índice</th></tr></thead>
            <tbody>{hist.map((h) => <tr key={h.ym}><td>{label(h.ym)}</td><td>{h.scores.reduce((a, b) => a + b, 0)} de 100</td></tr>)}</tbody></table>
        </>
      )}

      <h2 className="wfm-h2 wfm-silver">Escala de referência</h2>
      <table className="wfm-table"><tbody>{RADAR_SCALE.map(([a, b]) => <tr key={a}><td className="wfm-cin text-[#c7a24a]" style={{ whiteSpace: "nowrap" }}>{a}</td><td>{b}</td></tr>)}</tbody></table>
      <p style={{ fontSize: "1rem", marginTop: "1rem" }}>O objetivo não é competir com outros membros, mas acompanhar a própria evolução ao longo do tempo. O radar é uma ferramenta de reflexão pessoal, não um teste psicológico validado ou uma medida científica da consciência.</p>
    </div>
  );
}
