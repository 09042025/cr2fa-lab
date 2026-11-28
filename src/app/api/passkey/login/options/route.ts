import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getUser } from "@/lib/auth";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { listPasskeys, rpInfo, saveChallenge } from "@/lib/passkey";
import { rateLimit } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  if (!rateLimit(`pk-opt:${clientIp(req)}`, 30)) return fail("Muitas tentativas. Aguarde alguns minutos.", 429);
  const user = await getUser();
  const { rpID } = rpInfo(req);
  // Logado (destravar o app): só aceita as chaves da própria conta. Sem login: o iPhone escolhe a chave.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: user ? listPasskeys(user.id).map((p) => ({ id: p.credential_id })) : undefined,
  });
  return json({ options, challengeId: saveChallenge(options.challenge, "login", user?.id ?? null) });
}
