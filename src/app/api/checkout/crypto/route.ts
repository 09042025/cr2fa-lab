import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createCryptoOrder, formatUnits, findNetwork } from "@/lib/crypto";
import { fail, json, sameOrigin } from "@/lib/http";
import { spots } from "@/lib/mentoria";
import { canBuyBlack } from "@/lib/black";

const schema = z.object({ period: z.enum(["monthly", "yearly"]).default("monthly"), product: z.enum(["premium", "mentoria", "diamond", "black"]).default("premium"), network: z.string().max(20), asset: z.string().max(10) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  if (parsed.data.product === "black" && !canBuyBlack(user)) return fail("O Black Diamond VIP é por convite. Solicite o seu convite na página do plano.", 403);
  if (parsed.data.product === "mentoria" && spots().full) return fail("As vagas desta turma da Mentoria estão esgotadas. O Plano Diamond continua disponível.", 409);
  try {
    const order = await createCryptoOrder({ userId: user.id, ...parsed.data });
    const net = findNetwork(order.crypto_network!)!;
    const asset = net.assets.find((a) => a.symbol === order.crypto_asset)!;
    return json({
      orderId: order.id,
      product: order.product,
      network: net.name,
      asset: asset.symbol,
      address: order.crypto_address,
      amount: formatUnits(order.crypto_amount!, asset.decimals),
      expiresAt: order.expires_at,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Não foi possível criar o pedido.", 400);
  }
}
