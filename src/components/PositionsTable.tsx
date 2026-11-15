import Link from "next/link";
import { TickerLogo } from "@/components/TickerLogo";
import { AttentionBall } from "@/components/AttentionBall";

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

/** Nome curto do bloco, para caber na coluna. */
const shortBlock = (b: string) => (/fundos imobili/i.test(b) ? "FIIs" : /^reserva/i.test(b) ? "Reserva" : /^criptomoedas?$/i.test(b) ? "Cripto" : b);

/** Posições: clicar em uma linha abre a página do ativo (indicadores, compra, venda, ajuste e remover). */
export function PositionsTable({ rows }: { rows: PositionRowData[] }) {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <Link key={r.id} href={`/painel/posicao/${r.id}`} className="block rounded-lg border border-line bg-panel-2 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><Logo r={r} size={26} /><span className="truncate">{r.label}</span>{r.b3 && <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</span>
              <span className="money shrink-0 text-sm font-semibold">{r.value}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2"><span className="text-[11px] text-muted">{shortBlock(r.block)}</span><AttentionBall a={r.attn} /></div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-muted">
              <div><p className="text-[10px] uppercase">Qtd.</p><p className="money text-white">{r.qty}</p></div>
              <div><p className="text-[10px] uppercase">P. médio</p><p className="money text-white">{r.avg ?? (r.needsAvg ? "ajustar" : "—")}</p></div>
              <div><p className="text-[10px] uppercase">Atual</p><p className="text-white">{r.price}</p></div>
              <div><p className="text-[10px] uppercase">Result.</p><p className={r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : "text-white"}>{r.result}</p></div>
            </div>
          </Link>
        ))}
      </div>
      <table className="hidden sm:table data w-full table-fixed text-xs [&_td]:overflow-hidden [&_td]:px-1.5 [&_td]:py-2 [&_th]:px-1.5 [&_th]:text-[10px]">
        <thead><tr><th className="w-[9%]">Bloco</th><th className="w-[22%]">Posição</th><th className="w-[8%]">Atenção</th><th className="num w-[10%]">Qtd.</th><th className="num w-[13%]">Preço médio</th><th className="num w-[12%]">Atual</th><th className="num w-[9%]">Result.</th><th className="num w-[17%]">Valor</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-panel-2">
              <td className="!whitespace-normal break-words">{shortBlock(r.block)}</td>
              <td className="!whitespace-normal font-semibold"><Link href={`/painel/posicao/${r.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 hover:underline"><Logo r={r} size={24} /><span className="min-w-0 break-words">{r.label}</span>{r.b3 && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-gold-soft">B3</span>}</Link></td>
              <td><AttentionBall a={r.attn} /></td>
              <td className="num"><span className="money">{r.qty}</span></td>
              <td className="num">{r.avg ?? (r.needsAvg ? <span className="text-[10px] leading-tight text-muted">ajustar</span> : "—")}</td>
              <td className="num">{r.price}</td>
              <td className={`num ${r.resultTone === "up" ? "text-up" : r.resultTone === "down" ? "text-down" : ""}`}>{r.result}</td>
              <td className="num"><span className="money">{r.value}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
