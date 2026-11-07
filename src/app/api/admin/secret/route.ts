import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { setSetting } from "@/lib/settings";

/** Chaves que o admin pode guardar no banco quando a variável do Railway não chega ao servidor. */
const ALLOWED: Record<string, { setting: string; re: RegExp; hint: string }> = {
  coinalyze: { setting: "coinalyze_api_key", re: /^[A-Za-z0-9-]{16,80}$/, hint: "A chave da Coinalyze tem letras, números e hifens (cerca de 36 caracteres)." },
};

async function admin(req: Request) {
  if (!sameOrigin(req)) return "Origem inválida.";
  const u = await getUser();
  return u && u.role === "admin" ? null : "Acesso restrito.";
}

export async function POST(req: Request) {
  const denied = await admin(req); if (denied) return fail(denied, 403);
  const b = (await req.json().catch(() => null)) as { name?: string; key?: string } | null;
  const def = ALLOWED[b?.name ?? ""];
  if (!def) return fail("Chave desconhecida.");
  const key = (b?.key ?? "").trim();
  if (!def.re.test(key)) return fail(def.hint);
  try { setSetting(def.setting, key); } catch (e) { return fail(`Erro ao gravar no banco: ${e instanceof Error ? e.message : "desconhecido"}`, 500); }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = await admin(req); if (denied) return fail(denied, 403);
  const b = (await req.json().catch(() => null)) as { name?: string } | null;
  const def = ALLOWED[b?.name ?? ""];
  if (!def) return fail("Chave desconhecida.");
  setSetting(def.setting, null);
  return json({ ok: true });
}
