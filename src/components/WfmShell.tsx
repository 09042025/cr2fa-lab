import "@fontsource/unifrakturmaguntia/latin-400.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/eb-garamond/latin-400.css";
import "@fontsource/eb-garamond/latin-400-italic.css";
import "@fontsource/eb-garamond/latin-500.css";
import "@fontsource/im-fell-english/latin-400.css";
import "@fontsource/im-fell-english/latin-400-italic.css";
import "@/app/painel/comunidade/manifesto/manifesto.css";
import tile from "@/assets/wfs/tile.webp";

/** Moldura com o mesmo fundo preto e a arte da White Flame Society (usada nas páginas do Manifesto e da área VIP). */
export function WfmShell({ children }: { children: React.ReactNode }) {
  return (
    <article className="wfm">
      <style>{`body{background:#000 !important}`}</style>
      <div
        aria-hidden
        className="wfm-bg"
        style={{
          backgroundColor: "#000",
          backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.92) 0, rgba(0,0,0,0.66) 1500px, rgba(0,0,0,0.62) calc(100% - 2200px), rgba(0,0,0,0.9) calc(100% - 700px), #000 calc(100% - 120px)), url(${tile.src})`,
          backgroundSize: "100% 100%, 100% auto",
          backgroundRepeat: "no-repeat, repeat-y",
        }}
      />
      {children}
    </article>
  );
}

export function VipSeal({ className = "" }: { className?: string }) {
  return <span className={`inline-flex items-center rounded-md border border-gold/60 bg-black px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-gold-soft ${className}`}>VIP</span>;
}
