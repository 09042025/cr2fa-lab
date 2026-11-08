"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/investor-data";

/** Questionário do perfil de investidor: uma pergunta por vez, barra de progresso e botão Voltar. */
export function InvestorQuiz({ questions, onCancel }: { questions: Question[]; onCancel?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const q = questions[step];

  async function pick(i: number) {
    const next = answers.slice(0, step).concat(i);
    setAnswers(next);
    if (step < questions.length - 1) return setStep(step + 1);
    setBusy(true); setErr("");
    const r = await fetch("/api/investor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: next }) }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) return setErr("Não foi possível salvar. Tente de novo.");
    onCancel?.();
    router.refresh();
  }

  return (
    <section className="card p-5">
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
      <p className="text-xs text-muted">Pergunta {step + 1} de {questions.length}</p>
      <h2 className="mt-1 text-lg font-bold text-white">{q.q}</h2>
      <div className="mt-4 space-y-2">
        {q.options.map((o, i) => (
          <button key={o} type="button" disabled={busy} onClick={() => void pick(i)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm hover:bg-panel-2 disabled:opacity-60 ${answers[step] === i ? "border-gold bg-gold/10 text-white" : "border-line text-white"}`}>{o}</button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-down">{err}</p>}
      <div className="mt-4 flex items-center justify-between text-sm">
        <button type="button" onClick={() => (step > 0 ? setStep(step - 1) : onCancel?.())} disabled={step === 0 && !onCancel} className="text-muted underline hover:text-white disabled:opacity-0">{step === 0 ? "Cancelar" : "← Voltar"}</button>
        {busy && <span className="text-muted">Calculando…</span>}
      </div>
    </section>
  );
}
