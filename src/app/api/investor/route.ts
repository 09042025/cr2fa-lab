import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { getProfile, saveProfile } from "@/lib/investor";

export async function GET() {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  return json({ profile: getProfile(user.id) });
}

/** POST {answers: [índice da resposta em cada uma das 10 perguntas]} → calcula e salva o perfil. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = z.object({ answers: z.array(z.number().int().min(0).max(3)).length(10) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Responda todas as perguntas.");
  const r = saveProfile(user.id, parsed.data.answers);
  return r ? json(r, 201) : fail("Respostas inválidas.");
}
