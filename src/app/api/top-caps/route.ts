import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getTopCaps } from "@/lib/topcaps";

/** Maiores valores de mercado do mundo para o menu lateral (fonte: companiesmarketcap.com, atualizado a cada 10 min). */
export async function GET() {
  if (!(await getUser())) return fail("Faça login.", 401);
  const r = await getTopCaps();
  if (!r.data) return fail(r.error || "Indisponível agora.", 503);
  return json({ rows: r.data.slice(0, 10), fetchedAt: r.fetchedAt });
}
