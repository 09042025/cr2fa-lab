import { getUser } from "@/lib/auth";
import { graphFetch } from "@/lib/graph";
import { fail, json, sameOrigin } from "@/lib/http";
import { setSetting } from "@/lib/settings";
import { NETWORKS, exchangeOf } from "@/lib/sources";

async function admin(req: Request) {
  if (!sameOrigin(req)) return "Origem inválida.";
  const u = await getUser();
  return u && u.role === "admin" ? null : "Acesso restrito.";
}

/** Só administrador. Cadastra o ID de um subgraph (rede + exchange) depois de testar se ele tem o formato da Uniswap v3. */
export async function POST(req: Request) {
  const denied = await admin(req); if (denied) return fail(denied, 403);
  const b = (await req.json().catch(() => null)) as { chain?: string; dex?: string; id?: string } | null;
  const chain = b?.chain ?? "", dex = b?.dex ?? "", id = (b?.id ?? "").trim();
  const ex = exchangeOf(dex);
  if (!NETWORKS.some((n) => n.id === chain) || !ex || !ex.chains.includes(chain)) return fail("Rede ou exchange inválida.");
  if (ex.schema !== "uni3") return fail("Esta exchange ainda não tem leitor. Por enquanto só as do formato Uniswap v3.");
  if (!/^[A-Za-z0-9]{40,50}$/.test(id)) return fail("O ID do subgraph tem cerca de 44 letras e números (ex.: 5zvR82Qo…).");
  try {
    await graphFetch(id, "{ pools(first:1){ id } positions(first:1){ id } }");
  } catch (e) {
    return fail(`Esse subgraph não serve: ${e instanceof Error ? e.message : "erro"}. Procure um com as entidades "pools" e "positions".`);
  }
  setSetting(`graph_id:${chain}:${dex}`, id);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await admin(req); if (denied) return fail(denied, 403);
  const b = (await req.json().catch(() => null)) as { chain?: string; dex?: string } | null;
  if (!b?.chain || !b?.dex) return fail("Informe rede e exchange.");
  setSetting(`graph_id:${b.chain}:${b.dex}`, null);
  return json({ ok: true });
}
