"use client";

import { useEffect, useRef } from "react";

/** Gráfico interativo do TradingView (widget oficial e gratuito). */
export function TradingViewChart({ symbol, height = 560 }: { symbol: string; height?: number }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "100%";
    inner.style.minHeight = "520px";
    inner.style.width = "100%";
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
      hide_side_toolbar: window.innerWidth < 640,
      withdateranges: true,
      save_image: true,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [symbol]);

  return <div ref={box} className="tradingview-widget-container w-full overflow-hidden rounded-xl border border-line" style={{ height: `clamp(520px, 82dvh, ${height}px)`, minHeight: 520 }} />;
}
