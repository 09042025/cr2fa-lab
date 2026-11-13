import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { setSetting } from "@/lib/settings";
import { testYoutubeKey } from "@/lib/ytchat";

/** Só administrador. Testa e guarda (ou apaga) a chave da YouTube Data API v3. A chave nunca é devolvida. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  const body = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(key)) return fail("Cole a chave inteira (começa com AIza e tem cerca de 39 caracteres).");
  const bad = await testYoutubeKey(key);
  if (bad) return fail(bad);
  setSetting("youtube_api_key", key);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const admin = await getUser();
  if (!admin || admin.role !== "admin") return fail("Acesso restrito.", 403);
  setSetting("youtube_api_key", null);
  return json({ ok: true });
}
