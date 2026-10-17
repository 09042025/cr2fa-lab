"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "change";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    form.forEach((v, k) => (body[k] = String(v)));
    const url = mode === "login" ? "/api/auth/login" : mode === "register" ? "/api/auth/register" : "/api/auth/change-password";
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Algo deu errado. Tente novamente.");
        return;
      }
      router.push(data.next || "/painel");
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" className="input" required minLength={2} autoComplete="name" />
        </div>
      )}
      {mode !== "change" && (
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
      )}
      {mode === "change" ? (
        <>
          <div>
            <label className="label" htmlFor="current">Senha atual</label>
            <input id="current" name="current" type="password" className="input" required autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="next">Nova senha</label>
            <input id="next" name="next" type="password" className="input" required minLength={10} autoComplete="new-password" />
            <p className="mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>
          </div>
        </>
      ) : (
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" name="password" type="password" className="input" required minLength={mode === "register" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "register" && <p className="mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>}
        </div>
      )}
      {error && <p role="alert" className="rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{error}</p>}
      <button className="btn btn-gold w-full" disabled={loading}>
        {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta grátis" : "Salvar nova senha"}
      </button>
    </form>
  );
}
