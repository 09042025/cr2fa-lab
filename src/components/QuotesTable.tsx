import type { Quote } from "@/lib/market";
import { Change } from "@/components/ui";
import { brl, brlCompact } from "@/lib/format";

export function QuotesTable({ rows }: { rows: Quote[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead><tr><th>Código</th><th>Nome</th><th>Setor</th><th className="num">Preço</th><th className="num">Dia</th><th className="num">Volume</th><th className="num">Valor de mercado</th></tr></thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.symbol}>
              <td className="font-semibold">{q.symbol}</td>
              <td className="text-muted">{q.name}</td>
              <td>{q.sector}</td>
              <td className="num">{brl(q.price)}</td>
              <td className="num"><Change value={q.changePct} /></td>
              <td className="num">{q.volume === null ? "—" : q.volume.toLocaleString("pt-BR")}</td>
              <td className="num">{brlCompact(q.marketCap)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
