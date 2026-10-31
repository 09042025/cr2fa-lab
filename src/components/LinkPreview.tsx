"use client";

import { useEffect, useState } from "react";

interface Preview { url: string; site: string; title: string; description: string; image: string | null }

/** Primeiro link http(s) do texto (sem pontuação colada no fim). */
export function firstUrl(text: string): string | null {
  const m = /https?:\/\/[^\s<>"]+/i.exec(text);
  return m ? m[0].replace(/[.,;:!?)\]]+$/, "") : null;
}

const cache = new Map<string, Preview | null>();

/** Cartão com a prévia do primeiro link do texto: imagem, site, título e descrição. Não aparece se o site não oferece prévia. */
export function LinkPreview({ text }: { text: string }) {
  const url = firstUrl(text);
  const [p, setP] = useState<Preview | null | undefined>(url && cache.has(url) ? cache.get(url) : undefined);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    if (!url || cache.has(url)) return;
    let alive = true;
    fetch(`/api/community/preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { preview: Preview | null } | null) => { cache.set(url, d?.preview ?? null); if (alive) setP(d?.preview ?? null); })
      .catch(() => { if (alive) setP(null); });
    return () => { alive = false; };
  }, [url]);

  if (!url || !p) return null;
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-3 block overflow-hidden rounded-xl border border-line bg-ink/40 transition hover:border-gold/60">
      {p.image && imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)} className="max-h-60 w-full bg-panel-2 object-cover" />
      )}
      <div className="p-3">
        <p className="truncate text-[11px] uppercase tracking-wider text-muted">{p.site}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white">{p.title}</p>
        {p.description && <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted">{p.description}</p>}
      </div>
    </a>
  );
}
