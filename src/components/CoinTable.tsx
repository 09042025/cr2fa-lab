import Link from "next/link";
import type { CryptoCoin } from "@/lib/market";
import { Change } from "@/components/ui";
import { usd, usdCompact } from "@/lib/format";

export function CoinTable({ coins, start = 0 }: { coins: CryptoCoin[]; start?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead><tr><th className="w-8 !px-2">#</th><th>Ativo</th><th className="num">Preço</th><th className="num">24h</th><th className="num hidden md:table-cell">7d</th><th className="num hidden md:table-cell">Valor de mercado</th><th className="num hidden md:table-cell">Volume 24h</th></tr></thead>
        <tbody>
          {coins.map((c, i) => (
            <tr key={c.id}>
              <td className="!px-2 text-muted">{start + i + 1}</td>
              <td>
                <span className="flex items-center gap-2.5">
                  {c.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full bg-panel-2" /> : <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel-2 text-[10px] text-muted">{c.symbol.slice(0, 2)}</span>}
                  <span className="flex min-w-0 flex-col leading-tight">
                    <Link href={`/painel/cripto/ativo/${encodeURIComponent(c.id)}`} title="Ver informações e gráfico" className="max-w-[9.5rem] truncate text-gold-soft underline-offset-2 hover:underline md:max-w-none">{c.name}</Link>
                    <span className="text-xs uppercase text-muted">{c.symbol}<span className="md:hidden"> · VM {usdCompact(c.marketCapUsd)}</span></span>
                  </span>
                </span>
              </td>
              <td className="num">{usd(c.priceUsd)}</td>
              <td className="num"><Change value={c.change24h} /></td>
              <td className="num hidden md:table-cell"><Change value={c.change7d} /></td>
              <td className="num hidden md:table-cell">{usdCompact(c.marketCapUsd)}</td>
              <td className="num hidden md:table-cell">{usdCompact(c.volumeUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
