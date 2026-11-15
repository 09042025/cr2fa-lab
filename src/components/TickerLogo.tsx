"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Logo da empresa ao lado do código; se uma fonte falhar tenta a próxima e, sem nenhuma, mostra as iniciais. */
export function TickerLogo({ src, symbol, size = 22 }: { src?: string | string[] | null; symbol: string; size?: number }) {
  const list = (Array.isArray(src) ? src : src ? [src] : []).filter(Boolean);
  const [i, setI] = useState(0);
  const box = { width: size, height: size };
  return i < list.length ? (
    <img key={list[i]} src={list[i]} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" onError={() => setI((n) => n + 1)} className="shrink-0 rounded-full bg-white object-contain" style={box} />
  ) : (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-panel-2 text-[9px] font-bold text-gold-soft" style={box}>{symbol.slice(0, 2)}</span>
  );
}
