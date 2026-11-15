import Link from "next/link";
import { TickerLogo } from "@/components/TickerLogo";

export interface PositionRowData {
  id: number;
  block: string;
  label: string;
  symbol: string;
  logo: string | string[] | null;
  /** Ícone de reserva quando não há logo (ex.: renda fixa). */
  icon?: string | null;
  b3: boolean;
  qty: string;
  avg: string | null;
  needsAvg: boolean;
  price: string;
  result: string;
  resultTone: "up" | "down" | "none";
  value: string;
  /** Pontos de atenção: ruins + em atenção, de um total de indicadores avaliados. */
  attn: { points: number; total: number; critical: boolean } | null;
}

function Logo({ r, size }: { r: PositionRowData; size: number }) {
  if (!r.logo && r.icon) return <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-panel text-[13px]" style={{ width: size, height: size }}>{r.icon}</span>;
  return <TickerLogo src={r.logo} symbol={r.symbol} size={size} />;
}

const BALL = {
  red: { bg: "radial-gradient(circle at 32% 26%, #fca5a5 0%, #ef4444 45%, #7f1d1d 100%)", glow: "rgba(239,68,68,.45)" },
  yellow: { bg: "radial-gradient(circle at 32% 26%, #fde68a 0%, #eab308 45%, #713f12 100%)", glow: "rgba(234,179,8,.4)" },
  green: { bg: "radial-gradient(circle at 32% 26%, #bbf7d0 0%, #22c55e 45%, #14532d 100%)", glow: "rgba(34,197,94,.4)" },
};

/** Bolinha em alto relevo com "pontos/total" (ex.: 5/13). Vermelha: mais da metade ruim; amarela: há pontos; verde: nenhum. */
function Attn({ a }: { a: PositionRowData["attn"] }) {
  if (!a || a.total === 0) return <span title="Sem indicadores disponíveis para este ativo" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-panel text-[9px] font-bold text-muted" style={{ boxShadow: "inset 0 -2px 4px rgba(0,0,0,.5), inset 0 1px 2px rgba(255,255,255,.18)" }}>?</span>;
  const c = BALL[a.critical ? "red" : a.points > 0 ? "yellow" : "green"];
  return (
    <span
      title={`Pontos de atenção: ${a.points} de ${a.total}`} aria-label={`Pontos de atenção: ${a.points} de ${a.total}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[8px] tracking-tight font-bold leading-none text-white"
      style={{ background: c.bg, boxShadow: `inset 0 -3px 5px rgba(0,0,0,.45), inset 0 2px 3px rgba(255,255,255,.55), 0 3px 8px ${c.glow}, 0 1px 2px rgba(0,0,0,.6)`, textShadow: "0 1px 2px rgba(0,0,0,.7)" }}
    >{a.points}/{a.total}</span>
  );
}

/** Posições: clicar em uma linha abre a página do ativo (indicadores, compra, venda, ajuste e remover). */
export function PositionsTable({ rows }: { rows: PositionRowData[] }) {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <Link key={r.id} href={`/painel/posicao/${r.id}`} className="block rounded-lg border border-line bg-panel-2 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><Logo r={r} size={26} /><span className="truncate">{r.label}</span>{r.b3 && <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</span>
              <span className="shrink-0 text-sm font-semibold">{r.value}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2"><span className="text-[11px] text-muted">{r.block}</span><Attn a={r.attn} /></div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-muted">
              <div><p className="text-[10px] uppercase">Qtd.</p><p className="text-white">{r.qty}</p></div>
              <div><p className="text-[10px] uppercase">P. médio</p><p className="text-white">{r.avg ?? (r.needsAvg ? "ajustar" : "—")}</p></div>
              <div><p className="text-[10px] uppercase">Atual</p><p className="text-white">{r.price}</p></div>
              <div><p className="text-[10px] uppercase">Result.</p><p className={r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : "text-white"}>{r.result}</p></div>
            </div>
          </Link>
        ))}
      </div>
      <table className="hidden sm:table data w-full table-fixed text-xs [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:text-[10px]">
        <thead><tr><th className="w-[12%]">Bloco</th><th className="w-[22%]">Posição</th><th className="w-[19%]">Atenção</th><th className="num w-[8%]">Qtd.</th><th className="num w-[12%]">Preço médio</th><th className="num w-[11%]">Atual</th><th className="num w-[8%]">Result.</th><th className="num w-[8%]">Valor</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-panel-2">
              <td>{r.block}</td>
              <td className="font-semibold"><Link href={`/painel/posicao/${r.id}`} className="flex items-center gap-2 hover:underline"><Logo r={r} size={24} /><span className="break-words">{r.label}</span>{r.b3 && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</Link></td>
              <td><Attn a={r.attn} /></td>
              <td className="num">{r.qty}</td>
              <td className="num">{r.avg ?? (r.needsAvg ? <span className="text-[10px] text-muted">abra e ajuste</span> : "—")}</td>
              <td className="num">{r.price}</td>
              <td className={`num ${r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : ""}`}>{r.result}</td>
              <td className="num">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
