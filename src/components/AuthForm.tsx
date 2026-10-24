"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "change" | "forgot" | "reset";

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    form.forEach((v, k) => (body[k] = String(v)));
    if (mode === "reset") body.token = token ?? "";
    const url =
      mode === "login" ? "/api/auth/login"
      : mode === "register" ? "/api/auth/register"
      : mode === "forgot" ? "/api/auth/forgot-password"
      : mode === "reset" ? "/api/auth/reset-password"
      : "/api/auth/change-password";
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Algo deu errado. Tente novamente.");
        return;
      }
      if (mode === "forgot") {
        setDone(data.message || "Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha.");
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

  if (done) return <p role="status" className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-gold-soft">{done}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" className="input" required minLength={2} autoComplete="name" />
        </div>
      )}
      {(mode === "login" || mode === "register" || mode === "forgot") && (
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
      )}
      {mode === "forgot" ? null : mode === "reset" ? (
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <input id="password" name="password" type="password" className="input" required minLength={10} autoComplete="new-password" />
          <p className="mt-1 text-xs text-muted">Mínimo de 10 caracteres, com letras e números.</p>
        </div>
      ) : mode === "change" ? (
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
        {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta grátis" : mode === "forgot" ? "Enviar link por e-mail" : "Salvar nova senha"}
      </button>
    </form>
  );
}
