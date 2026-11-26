import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { canAccessVip } from "@/lib/wfs";
import { PILLARS, PILLS, THINKERS, WEEKS } from "@/lib/wfs-content";
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
        <p>Existe uma premissa fundamental: a Black Pill não deve ser uma passagem obrigatória. Ela representa uma armadilha possível durante o despertar. E a White Pill não representa um estado de iluminação definitiva, mas o início de uma vida de aprendizado consciente.</p>
      </div>

      <div className="wfm-pills">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pillsImg.src} alt="As quatro pílulas: Blue, Red, Black e White" />
          <figcaption className="wfm-cin">A JORNADA DA CONSCIÊNCIA</figcaption>
        </figure>
      </div>

      {PILLS.map((p) => (
        <section key={p.tone} className={`wfm-pill wfm-pill-${p.tone}`}>
          <h2 className="wfm-goth"><span className="wfm-cap" aria-hidden />{p.name}</h2>
          <h3>{p.steps.toUpperCase()} · {p.sub.toUpperCase()}</h3>
          <div className="wfm-body !px-0 !pt-0 !pb-0 !text-[#d7dcea]">
            <p>{p.text}</p>
            <ol className="list-none space-y-1 pl-0" style={{ fontSize: "1.05rem" }}>
              {WEEKS.filter((w) => w.tone === p.tone).map((w) => <li key={w.n}><span className="wfm-cin text-[#c7a24a]">PASSO {String(w.n).padStart(2, "0")}</span> — {w.title}</li>)}
            </ol>
          </div>
        </section>
      ))}

      <div className="wfm-body">
        <p>O membro que chega ao 12º passo retorna continuamente ao primeiro, mas com novas experiências, conhecimentos e responsabilidades.</p>
        <p className="wfm-big">A evolução não é linear. É uma espiral de aprendizado.</p>
        <div className="wfm-orn" aria-hidden>✦</div>
        <h2 className="wfm-goth wfm-silver text-center" style={{ fontSize: "clamp(1.8rem,6vw,2.6rem)" }}>Os quatro pilares</h2>
        <div className="grid grid-cols-2 gap-3" style={{ margin: "1rem 0 2rem" }}>
          {PILLARS.map((p) => (
            <div key={p.name} className="wfm-quote" style={{ margin: 0, padding: "0.9rem 0.6rem" }}>
              <div className="wfm-cin text-sm">{p.name.toUpperCase()}</div>
              <div style={{ fontFamily: "EB Garamond, serif", fontWeight: 400, letterSpacing: 0, fontSize: "1rem", marginTop: "0.3rem" }}>{p.text}</div>
            </div>
          ))}
        </div>

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
