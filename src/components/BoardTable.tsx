"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface BoardRow {
  key: string; pair: string; fee: number; source: string; sourceFull: string; owner: string; chain: string; dex: string; tokenId: string; canAnalyze: boolean;
  range: string; inRange: boolean; valueUsd: number; feesUsd: number; pnlUsd: number; roi: number; apr: number | null; ageDays: number;
}
type NumKey = "valueUsd" | "feesUsd" | "pnlUsd" | "roi" | "apr" | "ageDays";
const COLS: { k: NumKey; label: string; w: number; pct?: boolean }[] = [
  { k: "valueUsd", label: "Valor", w: 74 }, { k: "feesUsd", label: "Taxas", w: 74 }, { k: "pnlUsd", label: "PnL", w: 74 },
  { k: "roi", label: "ROI", w: 48, pct: true }, { k: "apr", label: "APR", w: 58, pct: true }, { k: "ageDays", label: "Idade", w: 44 },
];
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const money = (v: number) => `${v < 0 ? "-" : ""}$${Math.abs(Math.round(v)).toLocaleString("pt-BR")}`;
const val = (r: BoardRow, k: NumKey) => (k === "apr" ? r.apr ?? -Infinity : r[k]);
const tone = (v: number) => (v >= 0 ? "text-up" : "text-down");

/** Tabela com todas as colunas alinhadas, ordenação por clique no título e filtro mín/máx por coluna. Sem casas decimais. */
export function BoardTable({ rows }: { rows: BoardRow[] }) {
  const [sort, setSort] = useState<{ k: NumKey; dir: 1 | -1 }>({ k: "apr", dir: -1 });
  const [f, setF] = useState<Record<string, string>>({});
  const view = useMemo(() => {
    const num = (s: string | undefined) => (s === undefined || s.trim() === "" || isNaN(Number(s.replace(",", "."))) ? null : Number(s.replace(",", ".")));
    return rows.filter((r) => COLS.every((c) => {
      const mn = num(f[`${c.k}-min`]), mx = num(f[`${c.k}-max`]);
      if (mn === null && mx === null) return true;
      const raw = c.k === "apr" ? r.apr : r[c.k];
      if (raw === null) return false;
      const v = c.pct ? raw * 100 : raw;
      return (mn === null || v >= mn) && (mx === null || v <= mx);
    })).sort((a, b) => (val(b, sort.k) - val(a, sort.k)) * -sort.dir);
  }, [rows, f, sort]);
  const th = "px-1 py-1 text-right font-semibold";
  const inp = "input !w-full !px-1 !py-0.5 text-right text-[11px]";
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[11px] tabular-nums" style={{ minWidth: 810 }}>
          <colgroup><col style={{ width: 24 }} /><col style={{ width: 118 }} /><col style={{ width: 80 }} /><col style={{ width: 92 }} /><col style={{ width: 128 }} />{COLS.map((c) => <col key={c.k} style={{ width: c.w }} />)}<col style={{ width: 58 }} /></colgroup>
          <thead>
            <tr className="text-muted">
              <th className="px-1 py-1 text-left">#</th><th className="px-1 py-1 text-left">Pool</th><th className="px-1 py-1 text-left">Rede</th><th className="px-1 py-1 text-left">Carteira</th><th className="px-1 py-1 text-left">Faixa</th>
              {COLS.map((c) => (
                <th key={c.k} className={th}><button type="button" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (s.dir === 1 ? -1 : 1) : -1 }))} className="whitespace-nowrap hover:text-gold-soft">
                  <span title={c.k === "feesUsd" ? "Taxas já coletadas" : undefined}>{c.label}</span>{sort.k === c.k ? (sort.dir === -1 ? " ▼" : " ▲") : ""}</button></th>
              ))}
              <th />
            </tr>
            <tr>
              <th colSpan={5} className="px-1 pb-2 text-left text-[11px] font-normal text-muted">Filtrar (mín / máx; ROI e APR em %, idade em dias):</th>
              {COLS.map((c) => (
                <th key={c.k} className="px-0.5 pb-2">
                  <input aria-label={`${c.label} mínimo`} placeholder="mín" inputMode="decimal" className={inp} value={f[`${c.k}-min`] ?? ""} onChange={(e) => setF({ ...f, [`${c.k}-min`]: e.target.value })} />
                  <input aria-label={`${c.label} máximo`} placeholder="máx" inputMode="decimal" className={`${inp} mt-0.5`} value={f[`${c.k}-max`] ?? ""} onChange={(e) => setF({ ...f, [`${c.k}-max`]: e.target.value })} />
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.key} className="border-t border-line align-middle">
                <td className="px-1 py-1.5 text-muted">{i + 1}</td>
                <td className="whitespace-nowrap px-1 font-medium">{r.pair} <span className="rounded border border-line px-1 font-normal text-muted">{r.fee / 10000}%</span></td>
                <td className="truncate px-1 text-muted" title={r.sourceFull}>{r.source}</td>
                <td className="whitespace-nowrap px-1"><Link className="text-gold-soft hover:underline" href={`/painel/cripto/defi/saude?carteira=${r.owner}`}>{r.owner.slice(0, 6)}…{r.owner.slice(-4)}</Link></td>
                <td className="whitespace-nowrap px-1"><span className={r.inRange ? "text-up" : "text-down"}>{r.inRange ? "●" : "○"}</span> {r.range}</td>
                <td className="whitespace-nowrap px-1 text-right font-medium">{money(r.valueUsd)}</td>
                <td className="whitespace-nowrap px-1 text-right">{money(r.feesUsd)}</td>
                <td className={`whitespace-nowrap px-1 text-right ${tone(r.pnlUsd)}`}>{money(r.pnlUsd)}</td>
                <td className={`whitespace-nowrap px-1 text-right ${tone(r.roi)}`}>{int(r.roi * 100)}%</td>
                <td className={`whitespace-nowrap px-1 text-right ${r.apr === null ? "" : tone(r.apr)}`}>{r.apr === null ? "—" : `${int(r.apr * 100)}%`}</td>
                <td className="whitespace-nowrap px-1 text-right text-muted">{int(r.ageDays)} d</td>
                <td className="px-1 text-right">{r.canAnalyze && <Link className="whitespace-nowrap rounded border border-gold/50 px-1 py-0.5 font-semibold text-gold-soft hover:bg-gold/10" href={`/painel/cripto/defi/saude/posicao?carteira=${r.owner}&rede=${r.chain}&id=${r.tokenId}&proto=${r.dex}&de=posicoes`}>Analisar</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">{view.length} de {rows.length} posições. Clique no título da coluna para ordenar.</p>
    </>
  );
}
