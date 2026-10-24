import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCryptoPage } from "@/lib/market";
import { CoinTable } from "@/components/CoinTable";
import { DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { FREE_LIMITS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const GROUPS: { id: string; label: string; category: string; hint: string }[] = [
  { id: "stocks", label: "Ações tokenizadas", category: "tokenized-stock", hint: "Ações de empresas (Apple, Tesla e outras) representadas em token na blockchain." },
  { id: "rwa", label: "Todos os RWA", category: "real-world-assets-rwa", hint: "Ativos do mundo real em blockchain: títulos do Tesouro, crédito privado, imóveis, commodities e mais." },
  { id: "gold", label: "Ouro", category: "tokenized-gold", hint: "Tokens lastreados em ouro físico." },
  { id: "commodities", label: "Commodities", category: "tokenized-commodities", hint: "Outras commodities tokenizadas." },
  { id: "etfs", label: "ETFs", category: "tokenized-exchange-traded-funds-etfs", hint: "ETFs tokenizados." },
  { id: "preipo", label: "Pré-IPO", category: "tokenized-pre-ipo-stocks", hint: "Exposição a empresas ainda sem ações na bolsa." },
];

export default async function RwaPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const isPro = user.plan === "pro";
  const group = GROUPS.find((g) => g.id === sp.g) ?? GROUPS[0];
  const result = await getCryptoPage(1, group.category, 250);
  const all = result.data ?? [];
  const rows = isPro ? all : all.slice(0, FREE_LIMITS.crypto);

  return (
    <>
      <PageTitle title="RWA e ativos tokenizados" subtitle="Ações, ouro, commodities, ETFs e outros ativos do mundo real negociados em blockchain." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {GROUPS.map((g) => (
          <Link key={g.id} href={`/painel/cripto/rwa?g=${g.id}`} className={`btn ${g.id === group.id ? "btn-gold" : "btn-ghost"}`}>{g.label}</Link>
        ))}
      </div>
      <section className="card p-4">
        <p className="mb-2 text-sm text-muted">{group.hint}</p>
        <DataStatus result={result} source="CoinGecko" />
        {result.data && (rows.length ? <CoinTable coins={rows} /> : <p className="text-sm text-muted">Nenhum ativo encontrado nesta categoria agora.</p>)}
        {!isPro && result.data && all.length > rows.length && <div className="mt-4"><Locked feature={`Lista completa (${all.length} ativos)`} /></div>}
        {!isPro && <p className="mt-3 flex items-center gap-2 text-xs text-muted"><ProBadge /> Plano grátis mostra os {FREE_LIMITS.crypto} maiores de cada grupo.</p>}
      </section>
      <p className="mt-4 text-xs text-muted">Ativos tokenizados têm risco do emissor (quem guarda o ativo real), regulatório e de liquidez. Muitos não estão disponíveis para investidores do Brasil. Pesquise antes de comprar.</p>
      <Disclaimer />
    </>
  );
}
