import type { Block, Step } from "@/lib/wfs-steps";

export function Blocks({ b }: { b: Block[] }) {
  return (
    <>
      {b.map((x, i) => x.t === "p" ? <p key={i}>{x.text}</p> : x.t === "ul" ? <ul key={i}>{x.items.map((t) => <li key={t}>{t}</li>)}</ul> : <ol key={i}>{x.items.map((t) => <li key={t}>{t}</li>)}</ol>)}
    </>
  );
}

const COLOR = { blue: "#6fb7ff", red: "#ff7b7b", black: "#c9c9d6", white: "#ffffff" } as const;

/** Conteúdo completo de um passo (o que estudar, leitura, exercício, desafio...). */
export function StepBody({ s }: { s: Step }) {
  const sec = (title: string, b: Block[]) => (b.length ? <><h4>{title}</h4><Blocks b={b} /></> : null);
  return (
    <div className="wfm-step-body">
      {sec("Princípio central", s.principle)}
      {sec("Compreensão filosófica", s.philosophy)}
      {sec("O que estudar", s.study)}
      {sec("Leitura principal", s.reading)}
      {sec("Exercício prático", s.exercise)}
      {sec(s.n === 12 ? "Desafio permanente" : "Desafio", s.challenge)}
      {sec("Pergunta de reflexão", s.question)}
      {sec("Critério de evolução", s.criterion)}
      <div className="phrase"><Blocks b={s.phrase} /></div>
    </div>
  );
}

/** Um passo do protocolo, em cartão que abre e fecha, com todos os detalhes. */
export function StepCard({ s }: { s: Step }) {
  return (
    <details className="wfm-step">
      <summary>
        <span className="num" style={{ color: COLOR[s.phase] }}>PASSO {String(s.n).padStart(2, "0")}</span>
        <span className="ttl">{s.title.toUpperCase()}<span className="sub">{s.sub}</span></span>
      </summary>
      <StepBody s={s} />
    </details>
  );
}

const PILL: Record<Step["phase"], [string, string, string]> = { blue: ["#8fd0ff", "#1559d6", "#0a2f78"], red: ["#ff8a8a", "#b3121b", "#6e0a10"], black: ["#6b6b72", "#0b0b0e", "#c9c9d6"], white: ["#ffffff", "#aab4cc", "#7d89a6"] };

/** Cápsula (pílula) na cor da fase: azul, vermelha, preta ou branca. */
export function PillIcon({ phase, size = 44 }: { phase: Step["phase"]; size?: number }) {
  const [c1, c2, line] = PILL[phase];
  const id = `pill-${phase}`;
  return (
    <svg width={size} height={size * 0.5} viewBox="0 0 64 32" aria-hidden className="shrink-0" style={{ filter: `drop-shadow(0 0 6px ${c1}88)` }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
      <g transform="rotate(-18 32 16)">
        <rect x="3" y="7" width="58" height="18" rx="9" fill={`url(#${id})`} stroke={line} strokeWidth="1.2" />
        <line x1="32" y1="7" x2="32" y2="25" stroke={line} strokeWidth="1" opacity=".6" />
        <rect x="8" y="10" width="44" height="3" rx="1.5" fill="#fff" opacity=".35" />
      </g>
    </svg>
  );
}
