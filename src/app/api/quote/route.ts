import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getQuote } from "@/lib/dividends";
import { getAssetDetail } from "@/lib/market";
import { cryptoPrice, yahooPrice } from "@/lib/cryptoquote";

/** Preço atual de ação/FII da B3 ou de cripto (BTC, ETH, SOL…), usado ao cadastrar posição. Premium. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  const t = (new URL(req.url).searchParams.get("ticker") || "").trim().toUpperCase();
  if (/^[A-Z]{4}\d{1,2}$/.test(t)) {
    let price = (await getQuote(t)).data?.price ?? null;
    let name: string | null = null;
    if (price === null) price = await yahooPrice(`${t}.SA`);
    if (price === null) { const d = (await getAssetDetail(t)).data; price = d?.price ?? null; name = d?.name ?? null; }
    if (price === null) return fail("Não encontramos esse código na B3.", 404);
    return json({ ticker: t, kind: t.endsWith("11") ? "fiis" : "acoes", price, name });
  }
  if (/^[A-Z]{2,10}$/.test(t)) {
    const c = await cryptoPrice(t);
    if (!c) return fail("Não encontramos esse código.", 404);
    return json({ ticker: t, kind: "cripto", price: c.price, name: c.name });
  }
  return fail("Código inválido.");
}
