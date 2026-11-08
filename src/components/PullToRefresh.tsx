"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Evento que os blocos que buscam dados sozinhos (Stories, sino) escutam para recarregar. */
export const REFRESH_EVENT = "niza:refresh";

const LIMIT = 70; // quanto precisa puxar (em px) para disparar
const MAX = 110;

/**
 * "Puxar para atualizar" no app instalado (iPhone/Android). No navegador comum o próprio
 * navegador já faz isso; no app instalado não, por isso este componente.
 * Só começa quando a página está no topo e o dedo desce na vertical; ignora gráficos, vídeos e campos.
 */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const st = useRef({ y0: 0, x0: 0, on: false, dist: 0 });

  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-standalone")) return;
    const top = () => (document.scrollingElement?.scrollTop ?? window.scrollY) <= 0;
    const blocked = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (document.body.style.overflow === "hidden") return true; // janela aberta (publicar, story…)
      return !!el?.closest?.("canvas,iframe,video,input,textarea,select,[data-no-pull],[role=dialog]");
    };
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      st.current = { y0: t.clientY, x0: t.clientX, on: top() && !blocked(e.target), dist: 0 };
    };
    const move = (e: TouchEvent) => {
      const s = st.current;
      if (!s.on) return;
      const t = e.touches[0];
      const dy = t.clientY - s.y0;
      if (dy <= 0 || Math.abs(t.clientX - s.x0) > dy) { if (dy <= 0) { s.on = false; setPull(0); } return; }
      if (!top()) { s.on = false; setPull(0); return; }
      s.dist = Math.min(MAX, dy * 0.5);
      if (e.cancelable) e.preventDefault();
      setPull(s.dist);
    };
    const end = () => {
      const s = st.current;
      if (!s.on) return;
      s.on = false;
      if (s.dist >= LIMIT * 0.5) {
        setBusy(true); setPull(48);
        window.dispatchEvent(new Event(REFRESH_EVENT));
        router.refresh();
        setTimeout(() => { setBusy(false); setPull(0); }, 1100);
      } else setPull(0);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [router]);

  if (pull <= 0 && !busy) return null;
  const ready = pull >= LIMIT * 0.5;
  return (
    <div aria-hidden className="pointer-events-none fixed left-0 right-0 z-[9000] flex justify-center" style={{ top: "env(safe-area-inset-top)", transform: `translateY(${Math.max(0, pull - 28)}px)` }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 bg-panel shadow-lg">
        <svg viewBox="0 0 24 24" className={`h-5 w-5 text-gold ${busy ? "animate-spin" : ""}`} style={busy ? undefined : { transform: `rotate(${ready ? 180 : 0}deg)`, transition: "transform .15s" }} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {busy ? <path d="M21 12a9 9 0 1 1-6.2-8.55" /> : <><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>}
        </svg>
      </div>
    </div>
  );
}
