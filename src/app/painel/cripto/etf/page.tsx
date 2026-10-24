import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getEtfFlows } from "@/lib/etf";
import { FlowBars } from "@/components/Bars";
import { DataStatus, Disclaimer, Locked, PageTitle, ProBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

const m = (v: number | null) => (v === null ? "—" : `${v < 0 ? "−" : ""}US$ ${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`);
const br = (iso: string) => iso.split("-").reverse().join("/");
const short = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

export default async function EtfPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const user = await requireUser();
  const isPro = user.plan === "pro";
  const sp = await searchParams;
  const asset = sp.a === "eth" ? "eth" : "btc";
  const res = await getEtfFlows(asset);
  const rows = res.data?.rows ?? [];
  const days = isPro ? 90 : 10;
  const recent = rows.slice(-days);
  const lastRow = rows[rows.length - 1];
  const sum = (n: number) => rows.slice(-n).reduce((a, r) => a + (r.total ?? 0), 0);
  const cum = rows.reduce((a, r) => a + (r.total ?? 0), 0);
  const tab = (a: string) => `btn ${asset === a ? "btn-gold" : "btn-ghost"}`;

  return (
    <>
      <PageTitle title="Fluxo de ETFs de Cripto" subtitle="Entrada e saída diária de dinheiro nos ETFs de criptomoedas à vista (spot) dos EUA, fundo a fundo." />
      <p className="mb-4 rounded-lg border border-gold/30 bg-panel-2 p-3 text-sm text-muted">
        <strong className="text-gold-soft">ETFs de cripto, não de ações:</strong> são fundos negociados na bolsa americana que compram Bitcoin ou Ethereum de verdade (IBIT da BlackRock, FBTC da Fidelity, ETHA e outros). Entrada de dinheiro indica demanda institucional; saída indica venda.
      </p>
      <div className="mb-4 flex gap-2">
        <Link href="/painel/cripto/etf?a=btc" className={tab("btc")}>ETFs de Bitcoin (BTC)</Link>
        <Link href="/painel/cripto/etf?a=eth" className={tab("eth")}>ETFs de Ethereum (ETH)</Link>
      </div>
      <DataStatus result={res} source="Farside Investors" />
      {res.data && lastRow && (
        <>
          <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Último dia (" + br(lastRow.date) + ")", lastRow.total], ["Últimos 7 pregões", sum(7)], ["Últimos 30 pregões", sum(30)], ["Acumulado na tabela", cum]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg border border-line bg-panel-2 p-3">
                <p className="text-xs text-muted">{l as string}</p>
                <p className={`mt-1 text-lg font-semibold ${(v as number) < 0 ? "text-down" : "text-up"}`}>{m(v as number)}</p>
              </div>
            ))}
          </section>
          <section className="card mb-5 p-4">
            <h2 className="mb-2 font-semibold">Fluxo líquido diário dos ETFs de {asset === "eth" ? "Ethereum" : "Bitcoin"} {!isPro && <span className="text-xs font-normal text-muted">(10 pregões)</span>}</h2>
            <FlowBars items={recent.map((r) => ({ label: short(r.date), value: r.total ?? 0 }))} format={(v) => `${Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi`} />
            {!isPro && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><ProBadge /> Histórico de 90 pregões no plano Pró.</p>}
          </section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold text-gold-soft">Fluxo por fundo {!isPro && <ProBadge />}</h2>
          {isPro ? (
            <section className="card overflow-x-auto p-4">
              <table className="data">
                <thead><tr><th>Data</th>{res.data.funds.map((f) => <th key={f} className="num">{f}</th>)}<th className="num">Total</th></tr></thead>
                <tbody>
                  {[...rows].slice(-30).reverse().map((r) => (
                    <tr key={r.date}>
                      <td>{br(r.date)}</td>
                      {r.flows.map((v, i) => <td key={i} className={`num ${v === null ? "text-muted" : v < 0 ? "text-down" : "text-up"}`}>{v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>)}
                      <td className="num font-semibold">{m(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : <Locked feature="Fluxo diário de cada ETF (IBIT, FBTC, GBTC e outros)" />}
        </>
      )}
      <p className="mt-3 text-xs text-muted">Valores em milhões de dólares; negativo = saída líquida. Dados de Farside Investors (<a className="underline" href={`https://farside.co.uk/${asset}/`} target="_blank" rel="noopener noreferrer">farside.co.uk</a>), conforme publicados, sem garantia. Veja também o <a className="underline" href="https://coinmarketcap.com/etf/" target="_blank" rel="noopener noreferrer">painel de ETFs do CoinMarketCap ↗</a>.</p>
      <Disclaimer />
    </>
  );
}
