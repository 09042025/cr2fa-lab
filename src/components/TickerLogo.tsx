/* eslint-disable @next/next/no-img-element */
/** Logo da empresa ao lado do código; sem logo, mostra um círculo com as iniciais. */
export function TickerLogo({ src, symbol, size = 22 }: { src?: string | null; symbol: string; size?: number }) {
  const box = { width: size, height: size };
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="shrink-0 rounded-full bg-white object-contain" style={box} />
  ) : (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-panel-2 text-[9px] font-bold text-gold-soft" style={box}>{symbol.slice(0, 2)}</span>
  );
}
