import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { listPasskeys, rpInfo, saveChallenge } from "@/lib/passkey";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Entre na sua conta primeiro.", 401);
  const { rpID, rpName } = rpInfo(req);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(`niza-${user.id}`),
    attestationType: "none",
    excludeCredentials: listPasskeys(user.id).map((p) => ({ id: p.credential_id })),
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
  });
  return json({ options, challengeId: saveChallenge(options.challenge, "register", user.id) });
}
