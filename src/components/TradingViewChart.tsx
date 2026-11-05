"use client";

import { useEffect, useRef, useState } from "react";

/** Gráfico interativo do TradingView (widget oficial e gratuito). */
export function TradingViewChart({ symbol }: { symbol: string; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [full]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.position = "absolute";
    inner.style.inset = "0";
    el.appendChild(inner);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.text = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "America/Sao_Paulo",
      theme: "dark",
      style: "1",
      locale: "br",
      allow_symbol_change: true,
      hide_side_toolbar: !full && window.innerWidth < 640,
      withdateranges: true,
      save_image: true,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol, full]);

  // O widget às vezes nasce com uma altura pequena; força o iframe (e os elementos em volta) a preencher a caixa toda.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const put = (n: HTMLElement, k: string, v: string) => { if (n.style.getPropertyValue(k) !== v || n.style.getPropertyPriority(k) !== "important") n.style.setProperty(k, v, "important"); };
    const fit = () => {
      el.querySelectorAll("iframe").forEach((f) => {
        for (let n: HTMLElement | null = f.parentElement; n && n !== el; n = n.parentElement) { put(n, "height", "100%"); put(n, "width", "100%"); }
        put(f, "height", "100%"); put(f, "width", "100%"); put(f, "min-height", `${el.clientHeight}px`);
      });
    };
    fit();
    const mo = new MutationObserver(fit);
    mo.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "height"] });
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => { mo.disconnect(); ro.disconnect(); };
  }, [symbol, full]);

  return (
    <div className={full ? "fixed inset-0 z-[60] bg-ink p-1" : "relative"}>
      <div ref={box} className={`tradingview-widget-container relative w-full overflow-hidden rounded-xl border border-line ${full ? "h-full" : "h-[calc(100dvh-7rem)] min-h-[480px]"}`} />
      <button type="button" onClick={() => setFull((v) => !v)} aria-label={full ? "Sair da tela cheia" : "Gráfico em tela cheia"}
        className="absolute bottom-3 right-3 z-10 rounded-full border border-gold/50 bg-ink/90 px-3 py-1.5 text-xs font-semibold text-gold-soft shadow-lg">
        {full ? "× Fechar" : "⛶ Tela cheia"}
      </button>
    </div>
  );
}
