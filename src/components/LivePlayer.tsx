"use client";
import { useState } from "react";

/** O player só carrega ao clicar (a página abre mais leve e o YouTube só é chamado se a pessoa quiser). */
export function LivePlayer({ src, label, poster }: { src: string; label: string; poster?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
      {on ? (
        <iframe src={src} title={label} className="absolute inset-0 h-full w-full" allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 flex items-center justify-center" aria-label={label}>
          {poster && /* eslint-disable-next-line @next/next/no-img-element */ <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition group-hover:opacity-80" />}
          <span className="relative flex flex-col items-center gap-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink shadow-lg"><svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg></span>
            <span className="rounded bg-black/60 px-2 py-0.5 text-sm font-semibold text-white">{label}</span>
          </span>
        </button>
      )}
    </div>
  );
}
