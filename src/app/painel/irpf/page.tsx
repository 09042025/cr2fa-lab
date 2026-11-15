import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { backfillTickers, isCryptoHolding, isUsStock } from "@/lib/cryptoquote";
import { getQuote } from "@/lib/dividends";
import { getUsQuote } from "@/lib/usmarket";
import { companyOf, getCvmData, getFiiData } from "@/lib/cvm";
import { isFiiTicker } from "@/lib/assess";
import { Disclaimer, Locked, PageTitle } from "@/components/ui";
import { IrpfApp } from "@/components/IrpfApp";
import type { AssetKind, PortfolioItem } from "@/lib/irpf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imposto de Renda" };

interface H { id: number; block: string; label: string; value_cents: number; ticker: string | null; qty: number | null; avg_price: number | null }

export default async function IrpfPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const user = await requireUser();
  if (user.plan !== "pro") return <><PageTitle title="Imposto de Renda" subtitle="Simulado da declaração com criptografia de ponta a ponta." /><Locked feature="Simulado do Imposto de Renda (IRPF)" /></>;
  await backfillTickers(user.id);
  const sp = await searchParams;
  const now = new Date();
  const dflt = now.getMonth() < 5 ? now.getFullYear() - 1 : now.getFullYear();
  const year = Math.min(now.getFullYear(), Math.max(now.getFullYear() - 3, Number(sp.ano) || dflt));
  const holdings = db().prepare("SELECT id, block, label, value_cents, ticker, qty, avg_price FROM holdings WHERE user_id = ? AND block <> 'reserva' ORDER BY block, id").all(user.id) as H[];
  const cvm = getCvmData().data;
  const fii = getFiiData().data;

  const items: PortfolioItem[] = await Promise.all(holdings.map(async (h): Promise<PortfolioItem> => {
    const t = h.ticker?.toUpperCase() ?? null;
    const kind: AssetKind = isCryptoHolding(h) ? "cripto" : isUsStock(h) ? "acao_us" : h.block === "renda_fixa" ? "renda_fixa"
      : t && (h.block === "fiis" || isFiiTicker(t)) ? "fii" : t && h.block === "acoes" ? "acao" : "outro";
    let cnpj: string | null = null, legalName: string | null = null;
    let divs: { date: string; perShare: number }[] = [];
    if (t && kind === "acao" && cvm) { const c = companyOf(cvm, t); if (c) { cnpj = c.cnpj.padStart(14, "0"); legalName = c.company.name; } }
    if (t && kind === "fii" && fii) { const r = fii.byPrefix[t.slice(0, 4)]; if (r) { cnpj = r.cnpj ? r.cnpj.padStart(14, "0") : null; legalName = r.name || null; } }
    try {
      if (t && (kind === "acao" || kind === "fii")) divs = ((await getQuote(t)).data?.dividends ?? []).map((d) => ({ date: d.date, perShare: d.value }));
      else if (t && kind === "acao_us") divs = ((await getUsQuote(t)).data?.dividends ?? []).map((d) => ({ date: d.date, perShare: d.value }));
    } catch { /* sem proventos: o usuário informa */ }
    return { key: `${h.block}:${t ?? h.label}:${h.id}`, label: h.label, ticker: t, kind, qty: h.qty, avg: h.avg_price, valueCents: h.value_cents, cnpj, legalName, divs };
  }));

  return (
    <>
      <PageTitle title="Imposto de Renda (simulado)" subtitle="Monte a sua declaração com a carteira, de forma privada: o que você sobe e digita aqui fica só no seu navegador, criptografado, e nunca vai para o nosso servidor." />
      <IrpfApp items={items} year={year} />
      <Disclaimer />
    </>
  );
}
