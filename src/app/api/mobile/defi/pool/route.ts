import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getPoolDetail } from "@/lib/pooldetail";

/** Detalhes de um pool de DEX para o simulador de faixa e taxas (exclusivo Premium). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const d = id ? await getPoolDetail(id) : null;
  if (!d) return fail("Pool não encontrado. Volte e atualize a lista.", 404);
  return json(d);
}
