import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { getCryptoPage } from "@/lib/market";
import { FREE_LIMITS } from "@/lib/plans";

const GROUPS = [
  { id: "stocks", label: "Ações tokenizadas", category: "tokenized-stock", hint: "Ações de empresas (Apple, Tesla e outras) representadas em token na blockchain." },
  { id: "rwa", label: "Todos os RWA", category: "real-world-assets-rwa", hint: "Ativos do mundo real em blockchain: títulos do Tesouro, crédito privado, imóveis, commodities e mais." },
  { id: "gold", label: "Ouro", category: "tokenized-gold", hint: "Tokens lastreados em ouro físico." },
  { id: "commodities", label: "Commodities", category: "tokenized-commodities", hint: "Outras commodities tokenizadas." },
  { id: "etfs", label: "ETFs", category: "tokenized-exchange-traded-funds-etfs", hint: "ETFs tokenizados." },
  { id: "preipo", label: "Pré-IPO", category: "tokenized-pre-ipo-stocks", hint: "Exposição a empresas ainda sem ações na bolsa." },
];

/** RWA e ativos tokenizados. Grátis vê os maiores de cada grupo; Premium vê a lista toda (como no site). */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const pro = user.plan === "pro" || user.role === "admin";
  const group = GROUPS.find((g) => g.id === new URL(req.url).searchParams.get("g")) ?? GROUPS[0];
  const res = await getCryptoPage(1, group.category, 250);
  if (!res.data) return fail("Não foi possível carregar agora.", 503);
  const rows = pro ? res.data : res.data.slice(0, FREE_LIMITS.crypto);
  return json({
    pro, group: { id: group.id, hint: group.hint }, groups: GROUPS.map((g) => ({ id: g.id, label: g.label })),
    coins: rows.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, priceUsd: c.priceUsd, change24h: c.change24h, marketCapUsd: c.marketCapUsd, image: c.image ?? null })),
    total: res.data.length, freeLimit: FREE_LIMITS.crypto,
  });
}
