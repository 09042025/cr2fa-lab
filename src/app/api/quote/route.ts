import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getQuote } from "@/lib/dividends";
import { getAssetDetail } from "@/lib/market";

/** Preço atual de uma ação/FII da B3 (usado ao cadastrar posição). Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  const ticker = (new URL(req.url).searchParams.get("ticker") || "").trim().toUpperCase();
  if (!/^[A-Z]{4}\d{1,2}$/.test(ticker)) return fail("Código inválido.");
  const q = (await getQuote(ticker)).data;
  let price = q?.price ?? null;
  let name: string | null = null;
  if (price === null) {
    const d = (await getAssetDetail(ticker)).data;
    price = d?.price ?? null;
    name = d?.name ?? null;
  }
  if (price === null) return fail("Não encontramos esse código na B3.", 404);
  return json({ ticker, price, name });
}
