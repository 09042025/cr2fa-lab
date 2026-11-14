import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { buildPortfolioView } from "@/lib/portfolio-view";

/** Portfólio do app (exclusivo Premium): posições com preço médio e cotação, blocos, dividendos por mês e evolução. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  return json(await buildPortfolioView(user.id));
}
