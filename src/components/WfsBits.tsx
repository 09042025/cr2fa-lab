import type { Block, Step } from "@/lib/wfs-steps";

export function Blocks({ b }: { b: Block[] }) {
  return (
    <>
      {b.map((x, i) => x.t === "p" ? <p key={i}>{x.text}</p> : x.t === "ul" ? <ul key={i}>{x.items.map((t) => <li key={t}>{t}</li>)}</ul> : <ol key={i}>{x.items.map((t) => <li key={t}>{t}</li>)}</ol>)}
    </>
  );
}

const COLOR = { blue: "#6fb7ff", red: "#ff7b7b", black: "#c9c9d6", white: "#ffffff" } as const;

/** Um passo do protocolo, em cartão que abre e fecha, com todos os detalhes. */
export function StepCard({ s }: { s: Step }) {
  const sec = (title: string, b: Block[]) => (b.length ? <><h4>{title}</h4><Blocks b={b} /></> : null);
  return (
    <details className="wfm-step">
      <summary>
        <span className="num" style={{ color: COLOR[s.phase] }}>PASSO {String(s.n).padStart(2, "0")}</span>
        <span className="ttl">{s.title.toUpperCase()}<span className="sub">{s.sub}</span></span>
      </summary>
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
    </details>
  );
}
