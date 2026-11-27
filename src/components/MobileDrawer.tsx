"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "./Avatar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MentionsBell } from "./MentionsBell";

/**
 * No celular, o menu fica escondido e abre pela lateral ao tocar na foto (como no X).
 * No computador, o menu continua fixo à esquerda.
 */
export function MobileDrawer({ name, avatarId, logo, children }: { name: string; avatarId: number | null; logo: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  // Arrastar o dedo para o lado: para a direita abre o menu, para a esquerda fecha (só no celular).
  useEffect(() => {
    let sx = 0, sy = 0, ok = false;
    const scrollsSideways = (el: Element | null) => {
      for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
        if (n instanceof HTMLInputElement && n.type === "range") return true;
        if (n.scrollWidth > n.clientWidth + 4 && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true;
      }
      return false;
    };
    const ts = (e: TouchEvent) => { ok = e.touches.length === 1 && window.innerWidth < 768 && !scrollsSideways(e.target as Element); sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const te = (e: TouchEvent) => {
      if (!ok) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      setOpen(dx > 0);
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchend", te, { passive: true });
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 -mt-5 mb-1 flex items-center justify-between border-b border-line bg-ink/95 px-4 py-2 backdrop-blur md:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} className="rounded-full">
          <Avatar name={name} id={avatarId} size={36} />
        </button>
        {logo}
        <div className="flex items-center gap-2"><MentionsBell /><LanguageSwitcher compact /></div>
      </header>
      <MentionsBell className="fixed right-6 top-4 z-30 hidden md:block" />
      {open && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transition-transform duration-200 ease-out md:sticky md:top-5 md:z-auto md:h-[calc(100vh-2.5rem)] md:w-60 md:max-w-none md:shrink-0 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menu"
      >
        <div className="relative h-full">
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="absolute right-3 top-3 z-10 px-2 text-2xl leading-none text-muted hover:text-white md:hidden">×</button>
          {children}
        </div>
      </aside>
    </>
  );
}
