import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuote } from "@/lib/dividends";
import { monthlyIncome } from "@/lib/portfolio-calc";
import { TickerLogo } from "@/components/TickerLogo";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Dividendos de um mês, ativo por ativo (abre com toque duplo no mês, na página do Portfólio). */
export default async function IncomeMonthPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro") return <><PageTitle title="Dividendos" subtitle="Detalhe do mês." /><Locked feature="Portfólio" /></>;
  const mes = (await searchParams).mes ?? "";
  const back = <p className="mb-3 text-sm"><Link className="text-gold-soft underline" href="/painel/portfolio">← Voltar para o Portfólio</Link></p>;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return <>{back}<p className="text-sm text-muted">Mês inválido.</p></>;

  const today = new Date().toISOString().slice(0, 10);
  const hs = db().prepare("SELECT ticker, qty FROM holdings WHERE user_id = ? AND ticker IS NOT NULL AND qty > 0 AND block IN ('acoes','fiis')").all(user.id) as { ticker: string; qty: number }[];
  const quotes = new Map<string, Awaited<ReturnType<typeof getQuote>>["data"]>();
  await Promise.all([...new Set(hs.map((h) => h.ticker))].map(async (t) => { quotes.set(t, (await getQuote(t)).data); }));
  const income = monthlyIncome(hs.map((h) => ({ ticker: h.ticker, qty: h.qty, dividends: quotes.get(h.ticker)?.dividends ?? [] })), today);
  const cur = income.find((m) => m.month === mes);
  const title = `${MONTHS[Number(mes.slice(5)) - 1]} de ${mes.slice(0, 4)}`;

  return (
    <>
      {back}
      <PageTitle title={`Dividendos de ${title}`} subtitle="De qual ativo vem cada valor estimado." />
      {!cur ? <p className="text-sm text-muted">Este mês está fora da projeção (próximos 12 meses).</p> : (
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Total estimado: <span className="text-gold-soft">{cur.total ? brl(cur.total) : "nenhum provento"}</span></h2>
          <div className="space-y-1.5">
            {cur.items.map((x) => (
              <div key={`${x.ticker}-${x.date}`} className="flex items-center justify-between gap-2 rounded-md bg-panel-2 px-3 py-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <TickerLogo src={`https://icons.brapi.dev/icons/${x.ticker}.svg`} symbol={x.ticker} size={26} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{x.ticker}</p>
                    <p className="text-[11px] text-muted">{x.qty.toLocaleString("pt-BR")} × {brl(x.perShare)} · com {x.date.split("-").reverse().slice(0, 2).join("/")}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-gold-soft">{brl(x.total)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Estimativa baseada no que cada ativo pagou no mesmo mês nos últimos 12 meses; não é promessa de pagamento.</p>
        </section>
      )}
      <Disclaimer />
    </>
  );
}
