import { requireUser } from "@/lib/auth";
import { WfmShell } from "@/components/WfmShell";
import { VipLocked } from "@/components/VipLocked";
import { canAccessVip } from "@/lib/wfs";
import { OATH } from "@/lib/wfs-content";
import logo from "@/assets/wfs/logo-wolf.webp";

export const dynamic = "force-dynamic";
export const metadata = { title: "O Juramento da Chama Branca | Black Diamond VIP" };

export default async function Page() {
  const user = await requireUser();
  if (!canAccessVip(user)) return <VipLocked title="O Juramento da Chama Branca" />;
  return (
    <WfmShell>
      <header className="wfm-title" style={{ marginTop: 0, paddingTop: "1rem" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo.src} alt="" className="mx-auto w-40 sm:w-52" />
        <p className="wfm-kicker wfm-cin wfm-gold">WHITE FLAME SOCIETY</p>
        <h1 className="wfm-goth wfm-silver">O Juramento da Chama Branca</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
      </header>

      <div className="wfm-body wfm-oath">
        {OATH.map((l) => <p key={l}>{l}</p>)}
        <p>Não buscarei dominar o mundo.</p>
        <p>Buscarei governar a mim mesmo.</p>
        <div className="wfm-oath-box">A maior luta é a mente.</div>
        <div className="wfm-oath-box">A maior conquista é a liberdade.</div>
        <p style={{ fontSize: "1rem", opacity: 0.75 }}>Este compromisso é pessoal e voluntário.</p>
        <p className="wfm-oath-sign">White Flame Society — The Eternal Awakening</p>
      </div>
    </WfmShell>
  );
}
