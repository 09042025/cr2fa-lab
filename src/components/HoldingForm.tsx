"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS } from "@/lib/protocol";

const num = (v: FormDataEntryValue | null) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : undefined; };

export function HoldingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

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
        label: f.get("label"),
        value: Number(String(f.get("value")).replace(",", ".")) || 0,
        ticker: String(f.get("ticker") || "").trim() || undefined,
        qty: num(f.get("qty")),
        avgPrice: num(f.get("avg")),
      }),
    });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Erro ao salvar.");
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid items-end gap-3 sm:grid-cols-4">
      <div>
        <label className="label" htmlFor="block">Bloco</label>
        <select id="block" name="block" className="input">{BLOCKS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}</select>
      </div>
      <div><label className="label" htmlFor="label">Posição</label><input id="label" name="label" className="input" required maxLength={60} placeholder="ex.: Bitcoin, HGLG11" /></div>
      <div><label className="label" htmlFor="value">Valor atual (R$)</label><input id="value" name="value" className="input" inputMode="decimal" placeholder="ou use qtd. e preço" /></div>
      <div><label className="label" htmlFor="ticker">Código (ação/FII)</label><input id="ticker" name="ticker" className="input" maxLength={7} placeholder="ex.: BBAS3" /></div>
      <div><label className="label" htmlFor="qty">Quantidade</label><input id="qty" name="qty" className="input" inputMode="decimal" /></div>
      <div><label className="label" htmlFor="avg">Preço médio (R$)</label><input id="avg" name="avg" className="input" inputMode="decimal" /></div>
      <button className="btn btn-gold">Adicionar</button>
      {error && <p role="alert" className="text-sm text-down sm:col-span-4">{error}</p>}
    </form>
  );
}
