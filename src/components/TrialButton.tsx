"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TrialButton({ days, className = "btn btn-gold w-full" }: { days: number; className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/trial/start", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Não foi possível iniciar o teste. Tente novamente.");
        return;
      }
      router.push("/painel");
      router.refresh();
    } catch {
      setError("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={start} disabled={loading} className={className}>{loading ? "Aguarde..." : `Testar o Pró por ${days} dias grátis`}</button>
      {error && <p role="alert" className="mt-2 rounded-lg border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">{error}</p>}
    </div>
  );
}
