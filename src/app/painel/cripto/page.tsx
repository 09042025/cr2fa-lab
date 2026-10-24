import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCryptoPage } from "@/lib/market";
import { CoinTable } from "@/components/CoinTable";
import { DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { FREE_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const PER_PAGE = 100;
const MAX_PAGES = 10;

export default async function CryptoMarketPage({ searchParams }: { searchParams: Promise<{ pagina?: string; q?: string; tipo?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  // Links antigos (pools de DeFi) agora vivem na aba DeFi.
  if (sp.tipo) redirect(`/painel/cripto/defi?tipo=${encodeURIComponent(sp.tipo)}`);
  const isPro = user.plan === "pro";
  const page = isPro ? Math.min(Math.max(parseInt(sp.pagina || "1", 10) || 1, 1), MAX_PAGES) : 1;
  const term = (sp.q || "").trim().toLowerCase().slice(0, 30);
  const result = await getCryptoPage(page, undefined, PER_PAGE);
  const all = result.data ?? [];
  const filtered = isPro && term ? all.filter((c) => c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term)) : all;
  const rows = isPro ? filtered : filtered.slice(0, FREE_LIMITS.crypto);
  const start = (page - 1) * PER_PAGE;
  const qs = (p: number) => `/painel/cripto?pagina=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;

  return (
    <>
      <PageTitle title="Mercado cripto" subtitle="Ranking das criptomoedas por valor de mercado. No Protocolo, 60% do bloco é Bitcoin, 10% Ethereum e 30% stablecoins rendendo." />
      <section className="card p-4">
        <DataStatus result={result} source="CoinGecko" />
        {isPro ? (
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="q">Buscar nesta página</label>
              <input id="q" name="q" defaultValue={sp.q || ""} placeholder="Ex.: bitcoin, SOL" className="input" maxLength={30} />
            </div>
            <input type="hidden" name="pagina" value={page} />
            <button className="btn btn-gold">Buscar</button>
          </form>
        ) : (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted"><ProBadge /> Ranking completo (até 1.000 criptomoedas) e busca no plano Pró.</div>
        )}
        {result.data && <CoinTable coins={rows} start={start} />}
        {isPro && result.data && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? <Link className="btn btn-ghost" href={qs(page - 1)}>← Anterior</Link> : <span />}
            <span className="text-muted">Posições {start + 1} a {start + all.length}</span>
            {page < MAX_PAGES ? <Link className="btn btn-ghost" href={qs(page + 1)}>Próxima →</Link> : <span />}
          </div>
        )}
        {!isPro && result.data && <div className="mt-4"><Locked feature="Ranking completo de criptomoedas" /></div>}
      </section>
      <p className="mt-4 text-xs"><Link className="text-gold-soft underline" href="/painel/protocolo">Ver como esse bloco entra na sua carteira</Link></p>
      <Disclaimer />
    </>
  );
}
