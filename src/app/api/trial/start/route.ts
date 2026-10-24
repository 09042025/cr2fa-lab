import { getUser, rateLimit } from "@/lib/auth";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { startTrial } from "@/lib/trial";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login para começar o teste.", 401);
  // Evita criar várias contas do mesmo lugar só para ganhar vários testes.
  if (!rateLimit(`trial:${clientIp(req)}`, 3, 24 * 60 * 60 * 1000)) return fail("Muitos testes iniciados a partir deste endereço. Tente amanhã ou assine o Pró.", 429);
  const result = startTrial(user.id);
  if (!result.ok) return fail(result.error, 409);
  return json({ ok: true, expiresAt: result.expiresAt });
}
