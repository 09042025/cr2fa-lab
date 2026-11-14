import { redirect } from "next/navigation";

/** A aba "Ativos" foi absorvida por Ações e Fundos imobiliários. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  redirect((await searchParams).tipo === "fiis" ? "/painel/fiis" : "/painel/acoes");
}
