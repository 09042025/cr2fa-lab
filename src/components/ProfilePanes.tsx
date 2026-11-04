"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface PaneTab { id: string; label: string; node: ReactNode }

/** Abas do perfil que se arrastam para o lado, como no Instagram: Publicações, Fotos e Cashpills. */
export function ProfilePanes({ header, tabs, initial }: { header: ReactNode; tabs: PaneTab[]; initial: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const start = Math.max(0, tabs.findIndex((t) => t.id === initial));
  const [active, setActive] = useState(start);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => { const el = paneRefs.current[active]; if (el) setHeight(el.offsetHeight); }, [active]);

  useEffect(() => {
    const s = scroller.current;
    if (s && start > 0) s.scrollLeft = start * s.clientWidth;
  }, [start]);

  useEffect(() => {
    measure();
    const el = paneRefs.current[active];
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active, measure]);

  function onScroll() {
    const s = scroller.current;
    if (!s || !s.clientWidth) return;
    const i = Math.round(s.scrollLeft / s.clientWidth);
    if (i !== active && i >= 0 && i < tabs.length) {
      setActive(i);
      try { window.history.replaceState(null, "", i === 0 ? window.location.pathname : `${window.location.pathname}?aba=${tabs[i].id}`); } catch { /* sem histórico */ }
    }
  }

  function go(i: number) {
    const s = scroller.current;
    if (s) s.scrollTo({ left: i * s.clientWidth, behavior: "smooth" });
  }

  return (
    <>
      <section className="card mb-5 overflow-hidden">
        {header}
        <div role="tablist" aria-label="Seções do perfil" className="flex border-t border-line">
          {tabs.map((t, i) => (
            <button key={t.id} id={`tab-${t.id}`} role="tab" type="button" aria-selected={active === i} aria-controls={`pane-${t.id}`} onClick={() => go(i)}
              className={`flex-1 whitespace-nowrap border-b-2 px-3 py-3 text-center text-sm font-medium ${active === i ? "border-gold text-white" : "border-transparent text-muted hover:text-white"}`}>{t.label}</button>
          ))}
        </div>
      </section>
      <div ref={scroller} onScroll={onScroll} style={{ height, overscrollBehaviorX: "contain", scrollbarWidth: "none" }} className="flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden">
        {tabs.map((t, i) => (
          <div key={t.id} id={`pane-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} ref={(el) => { paneRefs.current[i] = el; }} className="w-full shrink-0 snap-start snap-always">{t.node}</div>
        ))}
      </div>
    </>
  );
}
