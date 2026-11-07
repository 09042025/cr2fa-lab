"use client";

import { useEffect, useState } from "react";

/**
 * Abertura do app instalado (tela inicial do iPhone/Android): fundo azul, o N e o nome NIZA INVEST
 * com zoom lento. Só aparece no app instalado (não no navegador) e uma vez por abertura.
 * O script em layout.tsx marca <html data-standalone> antes de pintar, então não há "piscada".
 */
export function PwaSplash() {
  const [gone, setGone] = useState(false);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    if (!el.hasAttribute("data-standalone")) { setGone(true); return; }
    let seen = false;
    try { seen = sessionStorage.getItem("niza_splash") === "1"; sessionStorage.setItem("niza_splash", "1"); } catch { /* sem armazenamento: mostra mesmo assim */ }
    if (seen) { setGone(true); return; }
    const t1 = setTimeout(() => setOut(true), 2200);
    const t2 = setTimeout(() => setGone(true), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (gone) return null;
  return (
    <div id="pwa-splash" aria-hidden className={`fixed inset-0 z-[9999] items-center justify-center bg-[#0b1a4a] transition-opacity duration-500 ${out ? "opacity-0" : "opacity-100"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/splash-logo.png" alt="" className="pwa-splash-logo w-[260px] max-w-[70vw]" />
    </div>
  );
}
