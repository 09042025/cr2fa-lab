import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { createSession, rateLimit } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { rpInfo, takeChallenge, type PasskeyRow } from "@/lib/passkey";

const schema = z.object({ challengeId: z.string().min(10).max(80), response: z.object({ id: z.string().min(1).max(600) }).passthrough() });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  if (!rateLimit(`pk-login:${clientIp(req)}`, 20)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Pedido inválido.");
  const ch = takeChallenge(parsed.data.challengeId, "login");
  if (!ch) return fail("O pedido expirou. Tente de novo.");
  const key = db().prepare("SELECT * FROM passkeys WHERE credential_id = ?").get(parsed.data.response.id) as PasskeyRow | undefined;
  // Se o desafio foi pedido já logado (destravar), a chave tem que ser da mesma conta.
  if (!key || (ch.userId !== null && ch.userId !== key.user_id)) return fail("Face ID não reconhecido. Entre com e-mail e senha.", 401);
  const { rpID, origin } = rpInfo(req);
  try {
    const v = await verifyAuthenticationResponse({
      response: parsed.data.response as unknown as AuthenticationResponseJSON,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: { id: key.credential_id, publicKey: new Uint8Array(key.public_key), counter: key.counter },
      requireUserVerification: true,
    });
    if (!v.verified) return fail("Não foi possível confirmar o Face ID.", 401);
    db().prepare("UPDATE passkeys SET counter = ? WHERE id = ?").run(v.authenticationInfo.newCounter, key.id);
  } catch {
    return fail("Não foi possível confirmar o Face ID.", 401);
  }
  const user = db().prepare("SELECT * FROM users WHERE id = ?").get(key.user_id) as UserRow | undefined;
  if (!user) return fail("Conta não encontrada.", 401);
  await createSession(user.id);
  return json({ ok: true, next: user.must_change_password ? "/trocar-senha" : "/painel" });
}
