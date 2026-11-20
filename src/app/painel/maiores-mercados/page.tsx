import { requireUser } from "@/lib/auth";
import { getTopCaps } from "@/lib/topcaps";
import { DataStatus, PageTitle } from "@/components/ui";
import { usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maiores do mundo" };

export default async function TopCapsPage() {
  await requireUser();
  const r = await getTopCaps();
  const rows = r.data ?? [];
  return (
    <>
      <PageTitle title="Maiores do mundo" subtitle="Os maiores valores de mercado do mundo: empresas, ouro, prata e Bitcoin. Valores em dólar (US$)." />
      <DataStatus result={r} source="companiesmarketcap.com" />
      {rows.length > 0 && (
        <div className="card overflow-x-auto p-2 sm:p-4">
          <table className="data">
            <thead><tr><th className="w-10">#</th><th>Ativo</th><th className="num">Valor de mercado</th><th className="num hidden sm:table-cell">Preço</th><th className="num">30 dias</th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.ticker + x.rank}>
                  <td className="text-muted">{x.rank}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.logo} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" className="h-7 w-7 shrink-0 rounded-full bg-white/90 object-contain p-0.5" />
                      <span className="min-w-0"><span className="block truncate font-medium text-white">{x.name}</span><span className="block text-xs text-muted">{x.ticker}</span></span>
                    </span>
                  </td>
                  <td className="num font-semibold">{usdCompact(x.marketCap)}</td>
                  <td className="num hidden sm:table-cell">{usd(x.price)}</td>
                  <td className={`num ${x.change30d === null ? "text-muted" : x.change30d >= 0 ? "text-up" : "text-down"}`}>{x.change30d === null ? "—" : `${x.change30d >= 0 ? "▲" : "▼"} ${Math.abs(x.change30d).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Lista dos 100 maiores da fonte, atualizada a cada 10 minutos. Os valores têm atraso de 10 minutos ou mais, e os de ouro e prata são estimativas. Logos de terceiros, para fins informativos.</p>
    </>
  );
}
