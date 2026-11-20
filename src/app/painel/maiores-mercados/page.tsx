import { requireUser } from "@/lib/auth";
import { getTopCaps } from "@/lib/topcaps";
import { DataStatus, PageTitle } from "@/components/ui";
import { usd, usdCompact } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maiores do mundo" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function TopCapsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const q = ((await searchParams).q ?? "").trim().slice(0, 40);
  const r = await getTopCaps();
  const all = r.data ?? [];
  const rows = q ? all.filter((x) => norm(`${x.name} ${x.ticker}`).includes(norm(q))) : all;
  return (
    <>
      <PageTitle title="Maiores do mundo" subtitle="Os maiores valores de mercado do mundo: empresas, ouro, prata e cripto. Valores em dólar (US$)." />
      <DataStatus result={r} source="companiesmarketcap.com" />
      {all.length > 0 && (
        <form method="get" className="mb-3 flex gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Buscar (ex.: Bitcoin, ETH, Apple)" className="input min-w-0 flex-1" aria-label="Buscar ativo" />
          <button className="btn btn-gold whitespace-nowrap" type="submit">Buscar</button>
        </form>
      )}
      {rows.length > 0 ? (
        <div className="card p-2 sm:p-4">
          <div className="flex items-center gap-1.5 border-b border-line px-1 pb-1.5 text-[10px] uppercase tracking-wide text-muted sm:gap-3 sm:text-xs">
            <span className="w-6 shrink-0 text-right">#</span>
            <span className="w-6 shrink-0 sm:w-7" />
            <span className="min-w-0 flex-1">Ativo</span>
            <span className="w-[5.5rem] shrink-0 text-right sm:w-32">Valor de mercado / preço</span>
            <span className="w-14 shrink-0 text-right sm:w-20">30 dias</span>
          </div>
          <ol>
            {rows.map((x) => (
              <li key={x.ticker + x.rank} className="flex items-center gap-1.5 border-b border-line/40 px-1 py-1.5 last:border-0 sm:gap-3">
                <span className="w-6 shrink-0 text-right text-[11px] text-muted sm:text-xs">{x.rank}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.logo} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" className="h-6 w-6 shrink-0 rounded-full bg-white/90 object-contain p-0.5 sm:h-7 sm:w-7" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-xs font-medium text-white sm:text-sm" title={x.name}>{x.name}</span>
                  <span className="block truncate text-[10px] text-muted sm:text-xs">{x.ticker}</span>
                </span>
                <span className="w-[5.5rem] shrink-0 text-right leading-tight sm:w-32">
                  <span className="block text-xs font-semibold sm:text-sm">{usdCompact(x.marketCap)}</span>
                  <span className="block text-[10px] text-muted sm:text-xs">{usd(x.price)}</span>
                </span>
                <span className={`w-14 shrink-0 text-right text-[11px] sm:w-20 sm:text-xs ${x.change30d === null ? "text-muted" : x.change30d >= 0 ? "text-up" : "text-down"}`}>
                  {x.change30d === null ? "—" : `${x.change30d >= 0 ? "▲" : "▼"} ${Math.abs(x.change30d).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : all.length > 0 ? (
        <p className="card p-4 text-sm text-muted">Nenhum ativo encontrado para “{q}” entre os {all.length} maiores. A fonte lista só os maiores.</p>
      ) : null}
      {all.length > 0 && <p className="mt-3 text-xs text-muted">{q ? `${rows.length} de ${all.length} ativos.` : `${all.length} ativos.`} Atualizada a cada 10 minutos. Os valores têm atraso de 10 minutos ou mais, e os de ouro e prata são estimativas. Logos de terceiros, para fins informativos.</p>}
    </>
  );
}
