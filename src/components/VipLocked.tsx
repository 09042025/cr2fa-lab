import Link from "next/link";
import { WfmShell, VipSeal } from "./WfmShell";
import { Diamond } from "./Diamond";
import { BLACK_FEATURES, BLACK_NAME, blackPriceCents, formatBRL } from "@/lib/plans";

/** Tela de bloqueio da área VIP: o Premium não entra. Mostra as condições e a anuidade atual. */
export function VipLocked({ title }: { title: string }) {
  return (
    <WfmShell>
      <section className="wfm-body" style={{ textAlign: "center", paddingTop: "2rem" }}>
        <div className="flex justify-center"><Diamond black size={96} className="drop-shadow-[0_0_34px_rgba(212,175,55,0.35)]" /></div>
        <p className="wfm-cin mt-3 text-xs tracking-[0.4em] text-[#c7a24a]">ÁREA EXCLUSIVA <VipSeal className="ml-2 align-middle" /></p>
        <h1 className="wfm-goth wfm-silver" style={{ fontSize: "clamp(2rem,7vw,3.4rem)", lineHeight: 1.05, margin: "0.3em 0" }}>{title}</h1>
        <div className="wfm-orn" aria-hidden>✦</div>
        <p>Este conteúdo é só para o administrador e para os convidados do <strong className="text-gold-soft">{BLACK_NAME}</strong>. O plano Premium e o Plano Diamond não dão acesso a esta área.</p>

        <div className="wfm-quote" style={{ textAlign: "left" }}>
          <p className="wfm-cin text-center text-xs tracking-[0.3em] text-[#c7a24a]" style={{ margin: 0 }}>CONDIÇÕES</p>
          <p className="wfm-goth text-center" style={{ fontSize: "2.2rem", margin: "0.2em 0 0", color: "#f6e6b4" }}>{formatBRL(blackPriceCents())} <span className="wfm-cin text-xs tracking-widest">POR ANO</span></p>
          <p className="text-center text-sm" style={{ fontFamily: "EB Garamond, serif", fontWeight: 400, letterSpacing: 0, margin: "0 0 0.8em" }}>Anuidade de 12 meses, liberada somente após o convite.</p>
          <ul className="space-y-1.5 text-sm" style={{ fontFamily: "EB Garamond, serif", fontWeight: 400, letterSpacing: 0, listStyle: "disc", paddingLeft: "1.2rem", textAlign: "left" }}>
            {BLACK_FEATURES.map((f) => <li key={f}>{f}</li>)}
            <li>Acesso ao White Flame Protocol, ao Juramento da Chama Branca e ao acompanhamento do Ciclo</li>
          </ul>
        </div>

        <p><Link href="/painel/black" className="btn btn-gold">Solicitar convite ou contratar</Link></p>
      </section>
    </WfmShell>
  );
}
