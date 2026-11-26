import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { canAccessVip } from "@/lib/wfs";
import { CORE_BOOKS, DAILY_ROUTINE, EXTRA_BOOKS, FILMS, MONTHLY_METHOD, SCHEDULE } from "@/lib/wfs-doctrine";

export const dynamic = "force-dynamic";
export const metadata = { title: "White Flame Journey | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="White Flame Journey" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        <p className="wfm-kicker wfm-cin wfm-gold">WHITE FLAME SOCIETY</p>
        <h1 className="wfm-goth wfm-silver">White Flame Journey</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
      </header>
      <div className="wfm-body">
        <p>A jornada inicial é estruturada em 12 meses, permitindo aprofundamento filosófico e aplicação prática de cada etapa.</p>
        <h2 className="wfm-h2 wfm-silver">Cronograma anual de estudos</h2>
        <table className="wfm-table"><thead><tr><th>Mês</th><th>Módulo</th><th>Competência</th></tr></thead>
          <tbody>{SCHEDULE.map(([m, a, b]) => <tr key={m}><td className="wfm-cin text-[#c7a24a]">{m}</td><td>{a}</td><td>{b}</td></tr>)}</tbody></table>

        <h2 className="wfm-h2 wfm-silver">Metodologia mensal</h2>
        {MONTHLY_METHOD.map(([a, b]) => <div key={a} className="wfm-card"><b>{a.toUpperCase()}</b>{b}</div>)}

        <h2 className="wfm-h2 wfm-silver">Rotina diária</h2>
        <ul style={{ listStyle: "disc", paddingLeft: "1.3rem" }}>{DAILY_ROUTINE.map((t) => <li key={t}>{t}</li>)}</ul>
        <p><strong>Total diário:</strong> 60 minutos. <strong>Total anual estimado:</strong> 365 horas de desenvolvimento pessoal.</p>
        <p style={{ fontSize: "1rem", opacity: 0.8 }}>O cronograma é uma referência de organização, podendo ser adaptado às circunstâncias e necessidades de cada membro.</p>

        <h2 className="wfm-h2 wfm-silver">Biblioteca White Flame</h2>
        <h3 className="wfm-cin text-center text-sm tracking-[0.25em] text-[#c7a24a]">AS 12 LEITURAS FUNDAMENTAIS</h3>
        <ol style={{ listStyle: "decimal", paddingLeft: "1.5rem" }}>{CORE_BOOKS.map((t) => <li key={t} style={{ margin: "0.3em 0" }}>{t}</li>)}</ol>
        <h3 className="wfm-cin mt-6 text-center text-sm tracking-[0.25em] text-[#c7a24a]">LEITURAS COMPLEMENTARES</h3>
        <ul style={{ listStyle: "disc", paddingLeft: "1.3rem" }}>{EXTRA_BOOKS.map((t) => <li key={t} style={{ margin: "0.3em 0" }}>{t}</li>)}</ul>
        <h3 className="wfm-cin mt-6 text-center text-sm tracking-[0.25em] text-[#c7a24a]">REFERÊNCIAS CINEMATOGRÁFICAS</h3>
        {FILMS.map(([a, b]) => <div key={a} className="wfm-card"><b>{a.toUpperCase()}</b>{b}</div>)}
        <p style={{ fontSize: "1rem", opacity: 0.8 }}>As obras cinematográficas são referências simbólicas para reflexão, não modelos de comportamento a serem reproduzidos integralmente.</p>
      </div>
    </WfmShell>
  );
}
