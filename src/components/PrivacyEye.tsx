"use client";
import { useEffect, useState } from "react";

const KEY = "niza:hide-values";

/** Olho para esconder os valores do portfólio (fica salvo neste aparelho). Elementos com a classe "money" ficam borrados. */
export function PrivacyEye() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try { setHidden(localStorage.getItem(KEY) === "1"); } catch { /* sem armazenamento */ }
  }, []);
  useEffect(() => {
    if (hidden) document.documentElement.setAttribute("data-hide", "1");
    else document.documentElement.removeAttribute("data-hide");
    return () => document.documentElement.removeAttribute("data-hide");
  }, [hidden]);
  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    try { localStorage.setItem(KEY, next ? "1" : "0"); } catch { /* ignora */ }
  };
  return (
    <button type="button" onClick={toggle} aria-label={hidden ? "Mostrar valores" : "Esconder valores"} aria-pressed={hidden} title={hidden ? "Mostrar valores" : "Esconder valores"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-panel-2 text-gold-soft" style={{ touchAction: "manipulation" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}
