import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { setSetting } from "@/lib/settings";

/** Só administrador. Guarda (ou apaga) a chave do The Graph no banco do servidor. A chave nunca é devolvida. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!/^[A-Za-z0-9]{20,64}$/.test(key)) return fail("A chave deve ter só letras e números (cerca de 32 caracteres).");
  try {
    setSetting("graph_api_key", key);
  } catch (e) {
    return fail(`Erro ao gravar no banco: ${e instanceof Error ? e.message : "desconhecido"}`, 500);
  }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  setSetting("graph_api_key", null);
  return json({ ok: true });
}
