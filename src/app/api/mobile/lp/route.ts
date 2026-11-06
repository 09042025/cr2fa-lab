import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { ADDRESS, getLpPositions, splitSpam } from "@/lib/lppositions";

/** Saúde das pools (somente leitura): posições Uniswap v3 de um endereço. Exclusivo Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro" && user.role !== "admin") return fail("Exclusivo do plano Premium.", 403);
  const address = (new URL(req.url).searchParams.get("address") ?? "").trim();
  if (!ADDRESS.test(address)) return fail("Endereço inválido. Cole o endereço da carteira (começa com 0x, 42 caracteres).", 400);
  const { shown, hidden } = splitSpam(await getLpPositions(address));
  return json({ ...shown, hidden: hidden.map((p) => ({ pair: p.pair, chain: p.chain, valueUsd: p.valueUsd })) });
}
