"use client";
import { useState } from "react";
import { LineChart } from "./LineChart";

interface Hist { t: number; apy: number | null; apyBase: number | null; tvl: number | null }
const usdC = (v: number) => (v >= 1e9 ? `US$ ${(v / 1e9).toFixed(2)} bi` : v >= 1e6 ? `US$ ${(v / 1e6).toFixed(1)} mi` : `US$ ${(v / 1e3).toFixed(0)} mil`);

/** Abas do gráfico do pool: Preço (GeckoTerminal, desenhado aqui), APR e TVL (histórico do DefiLlama). */
export function PoolCharts({ chart, history, priceHistory, firstToken }: { chart: { embed: string; page: string } | null; history: Hist[]; priceHistory: { t: number; c: number }[]; firstToken: string | null }) {
  const hasPrice = priceHistory.length > 1;
  const [tab, setTab] = useState<"price" | "apr" | "tvl">(chart || hasPrice ? "price" : "apr");
  const [simple, setSimple] = useState(!chart);
  const apr = history.filter((h) => h.apy !== null);
  const tvl = history.filter((h) => h.tvl !== null);
  const tabs: [typeof tab, string][] = [["price", "Preço"], ["apr", "APR"], ["tvl", "TVL"]];
  return (
    <section className="card mb-4 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map(([id, l]) => <button key={id} type="button" onClick={() => setTab(id)} className={`btn ${tab === id ? "btn-gold" : "btn-ghost"}`} disabled={id === "price" && !chart && !hasPrice}>{l}</button>)}
      </div>
      {tab === "price" && chart && !simple && (
        <>
          <iframe src={chart.embed} title="Gráfico de preço (DexScreener)" className="block w-full rounded-lg border border-line bg-[#0b1020]" style={{ height: 460 }} allow="clipboard-write; fullscreen" allowFullScreen />
          <p className="mt-2 text-xs text-muted">
            Gráfico do DexScreener. <a className="text-gold-soft hover:underline" href={chart.page} target="_blank" rel="noopener noreferrer">Abrir no DexScreener ↗</a>
            {hasPrice && <> · Não carregou? <button type="button" onClick={() => setSimple(true)} className="text-gold-soft underline">ver gráfico simples</button></>}
          </p>
        </>
      )}
      {tab === "price" && simple && hasPrice && (
        <>
          <LineChart points={priceHistory.map((h) => h.c)} format={(v) => `US$ ${v >= 1 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : v.toPrecision(3).replace(".", ",")}`} startTs={priceHistory[0].t} endTs={priceHistory[priceHistory.length - 1].t} color="auto" />
          <p className="mt-2 text-xs text-muted">Preço diário{firstToken ? ` de ${firstToken}` : ""} em US$, últimos 90 dias. Fonte: GeckoTerminal.{chart && <> <button type="button" onClick={() => setSimple(false)} className="text-gold-soft underline">Voltar ao DexScreener</button> · <a className="text-gold-soft hover:underline" href={chart.page} target="_blank" rel="noopener noreferrer">Abrir no DexScreener ↗</a></>}</p>
        </>
      )}
      {tab === "price" && simple && !hasPrice && chart && <p className="text-sm text-muted">Gráfico simples indisponível. <button type="button" onClick={() => setSimple(false)} className="text-gold-soft underline">Voltar ao DexScreener</button> · <a className="text-gold-soft hover:underline" href={chart.page} target="_blank" rel="noopener noreferrer">Abrir no DexScreener ↗</a></p>}
      {tab === "apr" && (apr.length > 1
        ? <><LineChart points={apr.map((h) => h.apy!)} format={(v) => `${v.toFixed(1).replace(".", ",")}%`} startTs={apr[0].t} endTs={apr[apr.length - 1].t} /><p className="mt-2 text-xs text-muted">APR total diário do pool. Fonte: DefiLlama.</p></>
        : <p className="text-sm text-muted">Histórico de APR indisponível para este pool.</p>)}
      {tab === "tvl" && (tvl.length > 1
        ? <><LineChart points={tvl.map((h) => h.tvl!)} format={usdC} startTs={tvl[0].t} endTs={tvl[tvl.length - 1].t} /><p className="mt-2 text-xs text-muted">TVL diário do pool. Fonte: DefiLlama.</p></>
        : <p className="text-sm text-muted">Histórico de TVL indisponível para este pool.</p>)}
    </section>
  );
}
