import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { chartLinks, cleanTicker, tradingViewSymbol } from "@/lib/charts";
import { getAssetDetail } from "@/lib/market";
import { Change, DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";
import { TradingViewChart } from "@/components/TradingViewChart";
import { brl, brlCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

const num = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default async function AssetPage({ params, searchParams }: { params: Promise<{ ticker: string }>; searchParams: Promise<{ de?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const ticker = cleanTicker((await params).ticker);
  const sp = await searchParams;
  const back = sp.de === "fiis" ? { href: "/painel/fiis", label: "Voltar para Fundos imobiliários" } : { href: "/painel/acoes", label: "Voltar para Ações" };
  if (!ticker) {
    return (
      <>
        <PageTitle title="Ativo não encontrado" />
        <Link className="text-gold-soft underline" href={back.href}>{back.label}</Link>
      </>
    );
  }
  const result = await getAssetDetail(ticker);
  const d = result.data;
  const symbol = tradingViewSymbol("b3", ticker);
  const isFii = sp.de === "fiis";
  const lower = ticker.toLowerCase();
  const docs: { label: string; url: string }[] = isFii
    ? [
        { label: "Relatórios gerenciais e documentos (Investidor10)", url: `https://investidor10.com.br/fiis/${lower}/` },
        { label: "Funds Explorer", url: `https://www.fundsexplorer.com.br/funds/${lower}` },
        { label: "Status Invest", url: `https://statusinvest.com.br/fundos-imobiliarios/${lower}` },
        { label: "FNET / B3 (documentos oficiais do fundo)", url: "https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM" },
      ]
    : [
        { label: "Investidor10", url: `https://investidor10.com.br/acoes/${lower}/` },
        { label: "Status Invest", url: `https://statusinvest.com.br/acoes/${lower}` },
        { label: "Resultados e documentos (RI da empresa, pelo Investidor10)", url: `https://investidor10.com.br/acoes/${lower}/` },
      ];
  const links = chartLinks("b3", ticker, null);

  return (
    <>
      <PageTitle title={d ? `${d.name} (${ticker})` : ticker} subtitle="Cotação, gráfico e informações do ativo." />
      <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href={back.href}>{back.label}</Link></p>
      <DataStatus result={result} source="brapi.dev (B3)" />

      {d && (
        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Preço" value={brl(d.price)} />
          <Item label="Variação no dia" value={<Change value={d.changePct} />} />
          <Item label="Volume" value={d.volume === null ? "—" : d.volume.toLocaleString("pt-BR")} />
          <Item label="Valor de mercado" value={brlCompact(d.marketCap)} />
        </section>
      )}

      {symbol && <TradingViewChart symbol={symbol} />}

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-xl font-bold text-gold-soft">Indicadores {!isPro && <ProBadge />}</h2>
      {isPro ? (
        d ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Item label="Mínima do dia" value={brl(d.dayLow)} />
            <Item label="Máxima do dia" value={brl(d.dayHigh)} />
            <Item label="Mínima 52 semanas" value={brl(d.low52)} />
            <Item label="Máxima 52 semanas" value={brl(d.high52)} />
            <Item label="P/L" value={num(d.pe)} />
            <Item label="Lucro por ação (LPA)" value={brl(d.eps)} />
          </section>
        ) : <p className="card p-4 text-sm text-muted">Indicadores indisponíveis no momento.</p>
      ) : (
        <Locked feature="Indicadores e histórico de proventos" />
      )}

      {isPro && d && (
        <>
          <h2 className="mb-3 mt-8 font-display text-xl font-bold text-gold-soft">Proventos recentes</h2>
          {d.dividends.length ? (
            <div className="card overflow-x-auto p-4">
              <table className="data">
                <thead><tr><th>Pagamento</th><th>Tipo</th><th className="num">Valor por cota/ação</th></tr></thead>
                <tbody>
                  {d.dividends.map((x, i) => (
                    <tr key={`${x.date}-${i}`}><td>{x.date.split("-").reverse().join("/")}</td><td>{x.label}</td><td className="num">{brl(x.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="card p-4 text-sm text-muted">Sem proventos registrados para este ativo.</p>}
        </>
      )}

      <h2 className="mb-3 mt-8 font-display text-xl font-bold text-gold-soft">{isFii ? "Relatórios gerenciais e documentos" : "Documentos e resultados"}</h2>
      <div className="card p-4">
        <ul className="space-y-2 text-sm">
          {docs.map((l) => <li key={l.url + l.label}><a className="text-gold-soft underline" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></li>)}
        </ul>
        {isFii && <p className="mt-3 text-xs text-muted">Os relatórios gerenciais mais recentes ficam nestes sites, direto da fonte oficial (B3/FNET). No FNET, filtre pelo nome do fundo e pelo tipo "Relatório Gerencial".</p>}
      </div>

      {links.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {links.map((l) => <a key={l.url} className="btn btn-ghost" href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>)}
        </div>
      )}
      <Disclaimer />
    </>
  );
}
