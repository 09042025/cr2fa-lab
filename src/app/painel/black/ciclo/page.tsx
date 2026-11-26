import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { WfsTracker } from "@/components/WfsTracker";
import { canAccessVip, getProgress } from "@/lib/wfs";
import { CYCLE } from "@/lib/wfs-content";
import { STEPS } from "@/lib/wfs-steps";
import ciclo from "@/assets/wfs/ciclo.webp";

export const dynamic = "force-dynamic";
export const metadata = { title: "O Ciclo Infinito da White Pill | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="O Ciclo Infinito da White Pill" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        <p className="wfm-kicker wfm-cin wfm-gold">WHITE FLAME SOCIETY</p>
        <h1 className="wfm-goth wfm-silver">O Ciclo Infinito da White Pill</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
      </header>

      <div className="wfm-pills" style={{ maxWidth: "36rem" }}>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ciclo.src} alt="O ciclo: questionar, estudar, aplicar, avaliar, corrigir e compartilhar, em volta do lobo da White Flame Society" />
        </figure>
      </div>

      <div className="wfm-body">
        <p>O despertar não termina. A White Pill é um ciclo que se repete a cada novo tema da sua vida: crenças, decisões, erros, objetivos e resultados.</p>
        <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)" }}>Como fazer, etapa por etapa</h2>
        <ol className="list-none space-y-3 pl-0">
          {CYCLE.map((c) => (
            <li key={c.n} className="rounded-lg border border-[#c7a24a]/30 bg-black/40 p-3">
              <div className="wfm-cin text-sm text-[#c7a24a]">{c.n}. {c.name.toUpperCase()}</div>
              <div style={{ fontSize: "1.1rem" }}>{c.how}</div>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: "1.2rem" }}><strong>Desafio permanente:</strong> ser capaz de abandonar uma convicção quando novas evidências demonstrarem que ela está errada.</p>
        <p className="wfm-big">O verdadeiro White Flame Wolf não é aquele que possui todas as respostas. É aquele que nunca perde a coragem de questioná-las.</p>
      </div>

      <WfsTracker initial={getProgress(user.id)} steps={STEPS} />
    </WfmShell>
  );
}
