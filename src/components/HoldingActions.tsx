"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Compra / venda / ajuste de uma posição. O preço médio segue o método da B3: a compra recalcula a média, a venda não muda. */
export function HoldingActions({ id }: { id: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<"buy" | "sell" | "set" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const n = (k: string) => Number(String(f.get(k) ?? "").replace(",", "."));
    const body = { id, action: mode, qty: n("qty"), price: mode === "sell" ? undefined : n("price") };
    const res = await fetch("/api/portfolio", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error || "Erro ao salvar.");
    setMode(null);
    router.refresh();
  }
  return (
    <div className="text-right">
      <div className="flex justify-end gap-2 text-xs">
        <button className="text-up underline" onClick={() => setMode(mode === "buy" ? null : "buy")}>compra</button>
        <button className="text-down underline" onClick={() => setMode(mode === "sell" ? null : "sell")}>venda</button>
        <button className="text-muted underline" onClick={() => setMode(mode === "set" ? null : "set")}>ajustar</button>
      </div>
      {mode && (
        <form onSubmit={submit} className="mt-2 flex flex-wrap items-end justify-end gap-2">
          <input name="qty" required inputMode="decimal" className="input w-24" placeholder={mode === "set" ? "Qtd. total" : "Quantidade"} />
          {mode !== "sell" && <input name="price" required inputMode="decimal" className="input w-28" placeholder={mode === "set" ? "Preço médio" : "Preço pago"} />}
          <button className="btn btn-gold">OK</button>
          {error && <p role="alert" className="w-full text-xs text-down">{error}</p>}
        </form>
      )}
    </div>
  );
}
