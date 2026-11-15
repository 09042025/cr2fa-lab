import Link from "next/link";
import type { Quote } from "@/lib/market";
import { TickerLogo } from "@/components/TickerLogo";
import { Change } from "@/components/ui";
import { brl, brlCompact } from "@/lib/format";
import { shortName } from "@/lib/names";
import { AttentionBall } from "@/components/AttentionBall";
import type { Extra } from "@/lib/brlist";

export function QuotesTable({ rows, origem, extras }: { rows: Quote[]; origem: "acoes" | "fiis"; extras?: Map<string, Extra> }) {
  return (
    <>
    <div className="space-y-2 md:hidden">
      {rows.map((q) => {
        const mc = brlCompact(q.marketCap ?? extras?.get(q.symbol)?.mc ?? null);
        return (
          <Link key={q.symbol} href={`/painel/ativo/${q.symbol}?de=${origem}`} className="block rounded-lg border border-line bg-panel-2 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gold-soft"><TickerLogo src={q.logo} symbol={q.symbol} /><span>{q.symbol}</span><span className="truncate text-xs font-normal text-muted">{shortName(q.name)}</span></span>
              <span className="shrink-0 text-sm font-semibold">{brl(q.price)} <Change value={q.changePct} /></span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-muted">
              <span className="min-w-0 truncate">{q.sector}</span>
              {extras && <AttentionBall a={extras.get(q.symbol)?.a ?? null} />}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-muted"><div><p className="text-[10px] uppercase">Volume</p><p className="text-white">{q.volume === null ? "—" : q.volume.toLocaleString("pt-BR")}</p></div><div><p className="text-[10px] uppercase">Valor de mercado</p><p className="text-white">{mc}</p></div></div>
          </Link>
        );
      })}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="data fit">
        <thead><tr><th className="w-[16%]">Código</th><th className="w-[21%]">Nome</th><th className="w-[17%]">Setor</th><th className="num w-[11%]">Preço</th><th className="num w-[9%]">Dia</th><th className="num w-[11%]">Volume</th><th className="num w-[11%]">Valor de mercado</th>{extras && <th className="num w-[8%]">Indic.</th>}</tr></thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.symbol}>
              <td className="font-semibold"><Link href={`/painel/ativo/${q.symbol}?de=${origem}`} title="Ver gráfico e informações" className="text-gold-soft underline-offset-2 hover:underline"><span className="inline-flex max-w-full items-center gap-1.5"><TickerLogo src={q.logo} symbol={q.symbol} />{q.symbol} <span aria-hidden>📈</span></span></Link></td>
              <td className="truncate text-muted" title={q.name}>{shortName(q.name)}</td>
              <td className="truncate" title={q.sector}>{q.sector}</td>
              <td className="num">{brl(q.price)}</td>
              <td className="num"><Change value={q.changePct} /></td>
              <td className="num">{q.volume === null ? "—" : q.volume.toLocaleString("pt-BR")}</td>
              <td className="num">{brlCompact(q.marketCap ?? extras?.get(q.symbol)?.mc ?? null)}</td>
              {extras && <td className="num"><AttentionBall a={extras.get(q.symbol)?.a ?? null} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
