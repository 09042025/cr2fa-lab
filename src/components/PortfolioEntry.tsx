"use client";

import { useState } from "react";
import { B3Import } from "@/components/B3Import";
import { HoldingForm } from "@/components/HoldingForm";

export function PortfolioEntry({ startOnB3 }: { startOnB3: boolean }) {
  const [tab, setTab] = useState<"b3" | "manual">(startOnB3 ? "b3" : "manual");
  return (
    <section className="card mb-6 p-4">
      <h2 className="mb-3 font-semibold">Registrar posições</h2>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Forma de registrar">
        <button type="button" role="tab" aria-selected={tab === "b3"} onClick={() => setTab("b3")} className={`btn ${tab === "b3" ? "btn-gold" : "btn-ghost"}`}>Importar da B3</button>
        <button type="button" role="tab" aria-selected={tab === "manual"} onClick={() => setTab("manual")} className={`btn ${tab === "manual" ? "btn-gold" : "btn-ghost"}`}>Preencher manualmente</button>
      </div>
      {tab === "b3" ? <B3Import /> : <HoldingForm />}
    </section>
  );
}
