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

      <div className="wfm-final">
        <div className="wfm-body" style={{ textAlign: "center" }}>
          {OATH.map((l) => <p key={l} className="wfm-big" style={{ fontSize: "clamp(1.3rem,3.6vw,1.7rem)", margin: "0.9em 0" }}>{l}</p>)}
          <p className="wfm-big">Não buscarei dominar o mundo.</p>
          <p className="wfm-big">Buscarei governar a mim mesmo.</p>
          <div className="wfm-quote">A MAIOR LUTA É A MENTE.</div>
          <div className="wfm-quote">A MAIOR CONQUISTA É A LIBERDADE.</div>
          <p className="wfm-cin mt-6 text-xs tracking-[0.35em] text-[#c7a24a]">WHITE FLAME SOCIETY — THE ETERNAL AWAKENING</p>
        </div>
      </div>
    </WfmShell>
  );
}
