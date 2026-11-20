"use client";

import { useEffect, useState } from "react";

interface Row { rank: number; name: string; ticker: string; marketCap: number; change30d: number | null; logo: string }
const compact = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 });

function Logo({ row }: { row: Row }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel-2 text-[10px] font-bold text-gold-soft" aria-hidden>{row.ticker.slice(0, 2)}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={row.logo} alt="" width={24} height={24} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="h-6 w-6 shrink-0 rounded-full bg-white/90 object-contain p-0.5" />;
}

/** Maiores valores de mercado do mundo, no menu lateral. Carrega depois da página (não atrasa nada) e se atualiza sozinho. */
export function TopCaps() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/top-caps", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (r.ok && Array.isArray(j.rows)) { setRows(j.rows); setErr(false); } else setErr(true);
      } catch { if (alive) setErr(true); }
    };
    void load();
    const t = setInterval(load, 5 * 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return (
    <details className="mt-2 shrink-0 rounded-lg border border-line bg-panel-2/40" open>
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gold-soft">Maiores do mundo</summary>
      <div className="px-2 pb-2">
        {!rows && !err && <p className="px-1 py-2 text-xs text-muted">Carregando…</p>}
        {!rows && err && <p className="px-1 py-2 text-xs text-muted">Indisponível agora. Tente de novo em instantes.</p>}
        {rows && (
          <ol className="space-y-1">
            {rows.map((r) => (
              <li key={r.ticker} className="flex items-center gap-2 rounded-md px-1 py-1 text-xs">
                <span className="w-4 shrink-0 text-right text-muted">{r.rank}</span>
                <Logo row={r} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white" title={r.name}>{r.name}</span>
                  <span className="block truncate text-[10px] text-muted">{r.ticker}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold">{compact(r.marketCap)}</span>
                  {r.change30d !== null && <span className={`block text-[10px] ${r.change30d >= 0 ? "text-emerald-400" : "text-red-400"}`}>{r.change30d >= 0 ? "▲" : "▼"} {Math.abs(r.change30d).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% 30d</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="px-1 pt-1 text-[10px] text-muted">Fonte: <a href="https://companiesmarketcap.com/assets-by-market-cap/" target="_blank" rel="noopener noreferrer" className="underline">companiesmarketcap.com</a>. Valores em dólar, com atraso de 10 min ou mais.</p>
      </div>
    </details>
  );
}
