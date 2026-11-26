import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { WfsRadar } from "@/components/WfsRadar";
import { canAccessVip, listRadar } from "@/lib/wfs";

export const dynamic = "force-dynamic";
export const metadata = { title: "White Flame Radar | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="White Flame Radar" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        <p className="wfm-kicker wfm-cin wfm-gold">WHITE FLAME SOCIETY</p>
        <h1 className="wfm-goth wfm-silver">White Flame Radar</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
      </header>
      <div className="wfm-body" style={{ paddingBottom: 0 }}>
        <p className="text-center">Autoavaliação da evolução pessoal. Uma vez por mês, dê uma nota de 0 a 10 para cada uma das dez dimensões. A soma vai de 0 a 100.</p>
      </div>
      <WfsRadar history={listRadar(user.id)} />
    </WfmShell>
  );
}
