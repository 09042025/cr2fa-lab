/**
 * Única ligação do simulado do IR com o servidor, e só quando o usuário clica: devolve ao Portfólio o preço médio que
 * estava faltando. Envia APENAS { id da posição, preço médio }. Nada da declaração (texto, CNPJ, valores, CPF) sai daqui.
 */
export interface AvgPush { id: number; avg: number }

export async function pushAvgToPortfolio(items: AvgPush[]): Promise<number> {
  const body = JSON.stringify({ items: items.map((x) => ({ id: x.id, avg: x.avg })) });
  const res = await fetch("/api/portfolio/avg", { method: "POST", headers: { "content-type": "application/json" }, body });
  if (!res.ok) throw new Error("Não foi possível atualizar o Portfólio agora.");
  const j = (await res.json()) as { updated?: number };
  return j.updated ?? 0;
}
