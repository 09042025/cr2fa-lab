"use client";

import Link from "next/link";
import { useState } from "react";
import { InvestorQuiz } from "./InvestorQuiz";
import { PROFILE_INFO, QUESTIONS, type Profile } from "@/lib/investor";

const TONE: Record<Profile, string> = { conservador: "text-sky-300", moderado: "text-gold-soft", arrojado: "text-emerald-300" };

/** Mostra o perfil salvo (com o que estudar primeiro) ou o questionário. */
export function InvestorProfileView({ saved, playlists }: { saved: { profile: Profile; score: number; reserveWarning: boolean; updatedAt: number } | null; playlists: { id: number; title: string; rank: number }[] }) {
  const [retake, setRetake] = useState(false);
  if (!saved || retake) return <InvestorQuiz questions={QUESTIONS} onCancel={saved ? () => setRetake(false) : undefined} />;
  const info = PROFILE_INFO[saved.profile];
  const rec = playlists.filter((p) => p.rank >= 0).sort((a, b) => a.rank - b.rank);
  return (
    <div className="space-y-4">
      <section className="card p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Seu perfil</p>
        <h2 className={`mt-1 font-display text-3xl font-bold ${TONE[saved.profile]}`}>{info.label}</h2>
        <p className="mt-1 text-xs text-muted">Pontuação {saved.score} de 40 · feito em {new Date(saved.updatedAt * 1000).toLocaleDateString("pt-BR")}</p>
        <p className="mt-3 text-sm leading-6">{info.summary}</p>
        {saved.reserveWarning && <p className="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-gold-soft">Você disse que não tem reserva de emergência. Antes de investir em ativos de risco, monte uma reserva em renda fixa de liquidez diária. Por isso o seu perfil foi limitado a moderado.</p>}
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-gold-soft">O CR2FA combina com você?</h3>
        <p className="mt-2 text-sm leading-6">{info.cr2fa}</p>
      </section>

      <section className="card p-5">
        <h3 className="font-bold text-gold-soft">Por onde começar na Masterclass</h3>
        <p className="mt-1 text-sm text-muted">Sugestão de ordem de estudo para o seu perfil: {info.focus.join(", ")}.</p>
        {rec.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {rec.map((p, i) => (
              <li key={p.id}><Link href={`/painel/cursos/${p.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-4 py-3 hover:bg-panel-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-sm font-bold text-ink">{i + 1}</span><span className="font-semibold text-white">{p.title}</span></Link></li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted">As playlists da Masterclass ainda estão sendo preparadas. <Link href="/painel/cursos" className="text-gold-soft underline">Ver Masterclass</Link></p>
        )}
      </section>

      <button type="button" onClick={() => setRetake(true)} className="btn btn-ghost">Refazer o questionário</button>
      <p className="text-xs leading-5 text-muted">Este resultado é uma orientação de estudo, baseada nas suas respostas. Não é recomendação de investimento, não é análise de perfil de corretora e não substitui um profissional habilitado. Investimentos têm risco de perda.</p>
    </div>
  );
}
