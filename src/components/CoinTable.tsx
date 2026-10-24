import Link from "next/link";
import type { CryptoCoin } from "@/lib/market";
import { Change } from "@/components/ui";
import { usd, usdCompact } from "@/lib/format";

export function CoinTable({ coins, start = 0 }: { coins: CryptoCoin[]; start?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead><tr><th>#</th><th>Ativo</th><th className="num">Preço</th><th className="num">24h</th><th className="num">7d</th><th className="num">Valor de mercado</th><th className="num">Volume 24h</th></tr></thead>
        <tbody>
          {coins.map((c, i) => (
            <tr key={c.id}>
              <td className="text-muted">{start + i + 1}</td>
              <td>
                <Link href={`/painel/cripto/ativo/${encodeURIComponent(c.id)}`} title="Ver informações e gráfico" className="inline-flex items-center gap-2 text-gold-soft underline-offset-2 hover:underline">
                  {c.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" width={22} height={22} loading="lazy" referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full bg-panel-2" /> : <span aria-hidden className="grid h-[22px] w-[22px] place-items-center rounded-full bg-panel-2 text-[10px] text-muted">{c.symbol.slice(0, 2)}</span>}
                  {c.name}
                </Link>{" "}
                <span className="text-muted">{c.symbol}</span>
              </td>
              <td className="num">{usd(c.priceUsd)}</td>
              <td className="num"><Change value={c.change24h} /></td>
              <td className="num"><Change value={c.change7d} /></td>
              <td className="num">{usdCompact(c.marketCapUsd)}</td>
              <td className="num">{usdCompact(c.volumeUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
