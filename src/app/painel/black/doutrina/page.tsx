import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { canAccessVip } from "@/lib/wfs";
import { CR2FA_TABLE, DISCLAIMER, ECOSYSTEM, FINAL_NOTES, PRINCIPLES, SYMBOLS } from "@/lib/wfs-doctrine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doutrina White Flame | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="Doutrina White Flame" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        <p className="wfm-kicker wfm-cin wfm-gold">WHITE FLAME SOCIETY</p>
        <h1 className="wfm-goth wfm-silver">Doutrina White Flame</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
      </header>
      <div className="wfm-body">
        <h2 className="wfm-h2 wfm-silver">Os seis princípios permanentes</h2>
        <p className="text-center" style={{ fontStyle: "italic" }}>A doutrina central da White Flame Society</p>
        {PRINCIPLES.map(([n, t]) => <div key={n} className="wfm-card"><b>{n}</b>{t}</div>)}
        <p>Esses princípios também se aplicam ao próprio manifesto, aos seus idealizadores e à comunidade.</p>
        <p className="wfm-big">Nenhum membro está acima do questionamento.</p>

        <h2 className="wfm-h2 wfm-silver">White Flame Protocol e Protocolo CR2FA</h2>
        <p className="text-center" style={{ fontStyle: "italic" }}>A integração entre consciência e patrimônio</p>
        <p>O White Flame Protocol trabalha o desenvolvimento do indivíduo. O Protocolo CR2FA trabalha a organização e a construção patrimonial. São metodologias complementares.</p>
        <table className="wfm-table"><thead><tr><th>White Flame Protocol</th><th>Protocolo CR2FA</th></tr></thead>
          <tbody>{CR2FA_TABLE.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table>
        <p style={{ marginTop: "1rem" }}>O patrimônio é uma ferramenta para ampliar possibilidades e autonomia, não uma medida do valor de um indivíduo.</p>
        <p className="wfm-big">Antes de aprender a administrar o dinheiro, aprenda a administrar a mente que toma as decisões sobre ele.</p>

        <h2 className="wfm-h2 wfm-silver">O ecossistema White Flame Society</h2>
        {ECOSYSTEM.map(([a, b]) => <div key={a} className="wfm-card"><b>{a.toUpperCase()}</b>{b}</div>)}

        <h2 className="wfm-h2 wfm-silver">A simbologia</h2>
        {SYMBOLS.map(([a, b]) => <div key={a} className="wfm-card"><b>{a.toUpperCase()}</b>{b}</div>)}

        <h2 className="wfm-h2 wfm-silver">Considerações finais</h2>
        {FINAL_NOTES.map((t) => <p key={t}>{t}</p>)}
        <p style={{ fontSize: "1rem", opacity: 0.8 }}>{DISCLAIMER}</p>
        <p>Não existe um último estágio da consciência. Existe apenas o momento em que compreendemos que jamais devemos parar de evoluir.</p>
        <p>A chama branca não representa o fim da jornada. Representa a decisão de nunca mais abandonar o caminho do conhecimento.</p>
        <div className="wfm-orn" aria-hidden>✦</div>
        <p className="wfm-oath-sign" style={{ textAlign: "center", fontFamily: "Cinzel, serif", letterSpacing: "0.12em", fontSize: "0.9rem", color: "#d9b45a" }}>WHITE FLAME SOCIETY — THE ETERNAL AWAKENING — O DESPERTAR ETERNO</p>
        <div className="wfm-oath"><div className="wfm-oath-box">A maior luta é a mente.</div><div className="wfm-oath-box">A maior conquista é a liberdade.</div><div className="wfm-oath-box">A liberdade não é fugir da Matrix, é não permitir que ela controle sua mente.</div></div>
      </div>
    </WfmShell>
  );
}
