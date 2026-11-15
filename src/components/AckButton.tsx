"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Confirma que o investidor olhou o ativo e está ciente da decisão (para os e-mails diários de alerta). */
export function AckButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="btn btn-gold mt-3"
      onClick={async () => {
        setBusy(true);
        await fetch("/api/portfolio/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
        router.refresh();
        setBusy(false);
      }}
    >
      Estou ciente e a decisão é minha
    </button>
  );
}
