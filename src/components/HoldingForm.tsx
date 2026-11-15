"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS } from "@/lib/protocol";

const num = (v: FormDataEntryValue | null) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : undefined; };

export function HoldingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [block, setBlock] = useState("cripto");
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [px, setPx] = useState<{ state: "idle" | "loading" | "ok" | "err"; price?: number; msg?: string }>({ state: "idle" });
  const t = ticker.trim().toUpperCase();
  const b3 = /^[A-Z]{4}\d{1,2}$/.test(t);
  const valid = b3 || /^[A-Z]{2,10}$/.test(t);

  // ao digitar um código válido da B3, busca o preço atual sozinho
  useEffect(() => {
    if (!valid) { setPx({ state: "idle" }); return; }
    setPx({ state: "loading" });
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/quote?ticker=${t}`);
        const j = await r.json().catch(() => ({}));
        if (r.ok && typeof j.price === "number") {
          setPx({ state: "ok", price: j.price });
          setBlock((b) => (j.kind === "cripto" ? "cripto" : b === "acoes" || b === "fiis" ? b : j.kind));
        } else setPx({ state: "err", msg: j.error || "Preço indisponível agora." });
      } catch { setPx({ state: "err", msg: "Sem conexão." }); }
    }, 500);
    return () => clearTimeout(timer);
  }, [t, valid]);

  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const q = Number(qty.replace(",", "."));
  const est = px.state === "ok" && px.price && q > 0 ? px.price * q : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        block: f.get("block"),
        label: String(f.get("label") || "").trim() || t,
        value: Number(String(f.get("value")).replace(",", ".")) || est || 0,
        ticker: b3 || (px.state === "ok" && block === "cripto") ? t : undefined,
        qty: num(f.get("qty")),
        avgPrice: num(f.get("avg")),
      }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Erro ao salvar.");
    form.reset();
    setTicker(""); setQty(""); setAvg(""); setBlock("cripto");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid items-end gap-3 sm:grid-cols-4">
      <div>
        <label className="label" htmlFor="block">Bloco</label>
        <select id="block" name="block" className="input" value={block} onChange={(e) => setBlock(e.target.value)}>{BLOCKS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>
      </div>
      <div><label className="label" htmlFor="label">Posição</label><input id="label" name="label" className="input" required={!valid} maxLength={60} placeholder={valid ? "opcional (usa o código)" : "ex.: Bitcoin, HGLG11"} /></div>
      <div><label className="label" htmlFor="value">Valor atual (R$)</label><input id="value" name="value" className="input" inputMode="decimal" placeholder={est ? `automático: ${brl(est)}` : "ou use qtd. e preço"} /></div>
      <div><label className="label" htmlFor="ticker">Código (ação, FII ou cripto)</label><input id="ticker" name="ticker" className="input uppercase" maxLength={10} placeholder="ex.: BBAS3, HGLG11, BTC, ETH" value={ticker} onChange={(e) => setTicker(e.target.value)} autoCapitalize="characters" />
        {px.state === "loading" && <p className="mt-1 text-xs text-muted">Buscando preço…</p>}
        {px.state === "ok" && px.price && <p className="mt-1 text-xs text-up">Preço atual: <strong>{brl(px.price)}</strong></p>}
        {px.state === "err" && <p className="mt-1 text-xs text-down">{px.msg}</p>}</div>
      <div><label className="label" htmlFor="qty">Quantidade</label><input id="qty" name="qty" className="input" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
      <div><label className="label" htmlFor="avg">Preço médio (R$)</label><input id="avg" name="avg" className="input" inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} />
        {px.state === "ok" && px.price && !avg && <button type="button" className="mt-1 text-xs text-gold-soft underline" onClick={() => setAvg(String(px.price).replace(".", ","))}>usar o preço atual</button>}</div>
      <button className="btn btn-gold">Adicionar</button>
      {error && <p role="alert" className="text-sm text-down sm:col-span-4">{error}</p>}
    </form>
  );
}
