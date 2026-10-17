"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BLOCKS } from "@/lib/protocol";

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
      body: JSON.stringify({ block: f.get("block"), label: f.get("label"), value: Number(String(f.get("value")).replace(",", ".")) }),
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
      <div><label className="label" htmlFor="value">Valor atual (R$)</label><input id="value" name="value" className="input" required inputMode="decimal" /></div>
      <button className="btn btn-gold">Adicionar</button>
      {error && <p role="alert" className="text-sm text-down sm:col-span-4">{error}</p>}
    </form>
  );
}
