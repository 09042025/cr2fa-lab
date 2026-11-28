import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json, sameOrigin } from "@/lib/http";
import { rpInfo, takeChallenge } from "@/lib/passkey";

const schema = z.object({ challengeId: z.string().min(10).max(80), response: z.record(z.string(), z.unknown()) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Entre na sua conta primeiro.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Pedido inválido.");
  const ch = takeChallenge(parsed.data.challengeId, "register");
  if (!ch || ch.userId !== user.id) return fail("O pedido expirou. Tente de novo.");
  const { rpID, origin } = rpInfo(req);
  try {
    const v = await verifyRegistrationResponse({
      response: parsed.data.response as unknown as RegistrationResponseJSON,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!v.verified) return fail("Não foi possível confirmar o Face ID.");
    const c = v.registrationInfo.credential;
    db().prepare("INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, c.id, Buffer.from(c.publicKey), c.counter, JSON.stringify(c.transports ?? []));
    return json({ ok: true });
  } catch {
    return fail("Não foi possível ativar o Face ID neste aparelho.");
  }
}
