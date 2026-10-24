import Link from "next/link";
import { chartHref, cleanTicker } from "@/lib/charts";
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
                {cleanTicker(c.symbol) ? (
                  <Link href={chartHref("cripto", c.symbol, { nome: c.name, id: c.id })} title="Ver gráfico" className="text-gold-soft underline-offset-2 hover:underline">{c.name}</Link>
                ) : (
                  <a href={`https://www.coingecko.com/en/coins/${encodeURIComponent(c.id)}`} target="_blank" rel="noopener noreferrer" title="Ver no CoinGecko" className="text-gold-soft underline-offset-2 hover:underline">{c.name} ↗</a>
                )}{" "}
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
