"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { flagUrl, langByCode, langFromCookie, LANGS, SOURCE_LANG, type Lang } from "@/lib/languages";

function Flag({ l, size = 20 }: { l: Lang; size?: number }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span aria-hidden style={{ width: size, display: "inline-block", textAlign: "center" }}>🌐</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={flagUrl(l.flag)} alt="" width={size} height={Math.round(size * 0.75)} loading="lazy" onError={() => setBad(true)} className="inline-block rounded-sm object-cover" style={{ width: size, height: Math.round(size * 0.75) }} />;
}

function setLang(code: string) {
  const host = location.hostname;
  const exp = "; path=/; max-age=31536000; SameSite=Lax";
  if (code === SOURCE_LANG) {
    for (const d of ["", `; domain=${host}`, `; domain=.${host}`]) document.cookie = `googtrans=; path=/; max-age=0${d}`;
  } else {
    document.cookie = `googtrans=/${SOURCE_LANG}/${code}${exp}`;
    document.cookie = `googtrans=/${SOURCE_LANG}/${code}${exp}; domain=${host}`;
  }
  location.reload();
}

/** Botão com a bandeira do idioma atual; abre uma lista com busca. A tradução é automática (Google Tradutor). */
export function LanguageSwitcher({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(SOURCE_LANG);
  const [q, setQ] = useState("");

  useEffect(() => { setCode(langFromCookie(document.cookie)); }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open]);

  const cur = langByCode(code);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? LANGS.filter((l) => l.native.toLowerCase().includes(t) || l.pt.toLowerCase().includes(t) || l.code.toLowerCase() === t) : LANGS;
  }, [q]);

  return (
    <>
      <button type="button" onClick={() => { setQ(""); setOpen(true); }} aria-label={`Idioma: ${cur.pt}. Alterar`} translate="no" className={`notranslate inline-flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs hover:border-gold/50 ${className}`}>
        <Flag l={cur} />
        {!compact && <span>{cur.native}</span>}
        <span className="text-muted" aria-hidden>▾</span>
      </button>
      {open && createPortal(
        <div className="notranslate fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" translate="no" role="dialog" aria-modal="true" aria-label="Escolher idioma" onClick={() => setOpen(false)}>
          <div className="card flex max-h-[85vh] w-full max-w-sm flex-col p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Idioma / Language</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="px-2 text-2xl leading-none text-muted hover:text-white">×</button>
            </div>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar idioma…" className="mb-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none" />
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {list.map((l) => (
                <li key={l.code}>
                  <button type="button" onClick={() => (l.code === code ? setOpen(false) : setLang(l.code))} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-panel-2 ${l.code === code ? "text-gold-soft" : ""}`}>
                    <Flag l={l} size={24} />
                    <span className="min-w-0 flex-1 truncate">{l.native}</span>
                    <span className="truncate text-xs text-muted">{l.pt}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-2 py-3 text-sm text-muted">Nenhum idioma encontrado.</li>}
            </ul>
            <p className="mt-3 text-xs text-muted">Tradução automática pelo Google Tradutor: pode conter imprecisões. O conteúdo original está em português.</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
