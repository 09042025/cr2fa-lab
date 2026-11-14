import { redirect } from "next/navigation";

/** O calendário agora fica dentro de Ações e de Fundos imobiliários. Mantém links antigos funcionando. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string; setor?: string; mes?: string }> }) {
  const sp = await searchParams;
  const p = new URLSearchParams({ aba: "calendario", ...(sp.setor ? { setor: sp.setor } : {}), ...(sp.mes ? { mes: sp.mes } : {}) });
  redirect(`/painel/${sp.tipo === "fiis" ? "fiis" : "acoes"}?${p.toString()}`);
}
