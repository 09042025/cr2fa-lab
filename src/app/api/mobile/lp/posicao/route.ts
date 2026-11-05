import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { ADDRESS, LP_CHAINS } from "@/lib/lppositions";
import { getLpDetail } from "@/lib/lpdetail";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const q = new URL(req.url).searchParams;
  const address = (q.get("address") ?? "").trim(), chain = q.get("rede") ?? "", id = q.get("id") ?? "";
  if (!ADDRESS.test(address) || !(LP_CHAINS as readonly string[]).includes(chain) || !/^\d{1,12}$/.test(id)) return fail("Posição inválida.", 400);
  const d = await getLpDetail(address, chain, id);
  return d ? json(d) : fail("Posição não encontrada.", 404);
}
