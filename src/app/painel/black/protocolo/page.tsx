import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { canAccessVip } from "@/lib/wfs";
import { THINKERS } from "@/lib/wfs-content";
import { INTRO, PHASES, PILLARS_FULL } from "@/lib/wfs-doctrine";
import { STEPS } from "@/lib/wfs-steps";
import { StepCard } from "@/components/WfsBits";
import pillsImg from "@/assets/wfs/pills.webp";
import logo from "@/assets/wfs/logo-wolf.webp";

export const dynamic = "force-dynamic";
export const metadata = { title: "White Flame Protocol | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="White Flame Protocol" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.src} alt="" className="mx-auto w-40 sm:w-52" />
        <p className="wfm-kicker wfm-cin wfm-gold">PROTOCOL</p>
        <h1 className="wfm-goth wfm-silver">White Flame Protocol</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
        <p className="wfm-sub">Os 12 passos para a soberania da mente</p>
        <p className="wfm-cin mt-3 text-xs tracking-[0.25em] text-[#c7a24a]">DA IGNORÂNCIA CONFORTÁVEL À CONSCIÊNCIA EM CONSTANTE EVOLUÇÃO</p>
      </header>

      <div className="wfm-body">
        <h2 className="wfm-h2 wfm-silver">1. Introdução</h2>
        {INTRO.map((t) => <p key={t}>{t}</p>)}
        <p><em>Existe uma premissa fundamental: a Black Pill não deve ser uma passagem obrigatória. Ela representa uma armadilha possível durante o despertar. E a White Pill não representa um estado de iluminação definitiva, mas o início de uma vida de aprendizado consciente.</em></p>
      </div>

      <div className="wfm-pills">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pillsImg.src} alt="As quatro pílulas: Blue, Red, Black e White" />
          <figcaption className="wfm-cin">A JORNADA DA CONSCIÊNCIA</figcaption>
        </figure>
      </div>

      <div className="wfm-body" style={{ paddingBottom: 0 }}><h2 className="wfm-h2 wfm-silver">2. As quatro fases da consciência</h2></div>
      {PHASES.map((p) => (
        <section key={p.tone} className={`wfm-pill wfm-pill-${p.tone}`}>
          <h2 className="wfm-goth"><span className="wfm-cap" aria-hidden />{p.name}</h2>
          <h3>{p.steps.toUpperCase()} · {p.sub.toUpperCase()}</h3>
          <div className="wfm-body !px-0 !pt-0 !pb-0 !text-[#d7dcea]">
            {p.body.map((t) => <p key={t}>{t}</p>)}
            <p><strong>Objetivo:</strong> {p.goal}</p>
          </div>
        </section>
      ))}

      <div className="wfm-body" style={{ paddingBottom: 0 }}>
        <h2 className="wfm-h2 wfm-silver">3. Os 12 passos da evolução da consciência</h2>
        <p className="text-center" style={{ fontSize: "1rem", opacity: 0.8 }}>Toque em um passo para abrir os detalhes: princípio, filosofia, o que estudar, leitura, exercício, desafio, reflexão e critério de evolução.</p>
        {STEPS.map((st) => <StepCard key={st.n} s={st} />)}
      </div>

      <div className="wfm-body">
        <p>O membro que chega ao 12º passo retorna continuamente ao primeiro, mas com novas experiências, conhecimentos e responsabilidades.</p>
        <p className="wfm-big">A evolução não é linear. É uma espiral de aprendizado.</p>
        <div className="wfm-orn" aria-hidden>✦</div>
        <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)" }}>4. Os quatro pilares da White Flame Society</h2>
        {PILLARS_FULL.map((p) => (
          <div key={p.name} className="wfm-card"><b>{p.n} — {p.name.toUpperCase()}</b><em>{p.tag}</em><div style={{ fontSize: "1.05rem" }}>{p.text}</div></div>
        ))}
        <div style={{ height: "1.5rem" }} />

        <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)" }}>A fundamentação filosófica</h2>
        <div className="overflow-x-auto" style={{ margin: "1rem 0" }}>
          <table className="w-full text-left" style={{ fontSize: "1rem", lineHeight: 1.4 }}>
            <thead><tr className="wfm-cin text-xs tracking-widest text-[#c7a24a]"><th className="py-2 pr-3">PENSADOR</th><th className="py-2 pr-3">OBRA RECOMENDADA</th><th className="py-2">APLICAÇÃO</th></tr></thead>
            <tbody>
              {THINKERS.map(([a, b, c]) => <tr key={a} className="border-t border-[#c7a24a]/25"><td className="py-2 pr-3">{a}</td><td className="py-2 pr-3">{b}</td><td className="py-2">{c}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="text-center" style={{ fontStyle: "italic" }}>Essa fundamentação dá profundidade intelectual ao manifesto, evitando que ele seja apenas uma coleção de frases motivacionais.</p>
      </div>
    </WfmShell>
  );
}
