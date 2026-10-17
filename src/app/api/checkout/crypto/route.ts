import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createCryptoOrder, formatUnits, findNetwork } from "@/lib/crypto";
import { fail, json, sameOrigin } from "@/lib/http";

const schema = z.object({ period: z.enum(["monthly", "yearly"]), network: z.string().max(20), asset: z.string().max(10) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Dados inválidos.");
  try {
    const order = await createCryptoOrder({ userId: user.id, ...parsed.data });
    const net = findNetwork(order.crypto_network!)!;
    const asset = net.assets.find((a) => a.symbol === order.crypto_asset)!;
    return json({
      orderId: order.id,
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
