import { z } from "zod";
import { getUser, rateLimit } from "@/lib/auth";
import { verifyCryptoPayment } from "@/lib/crypto";
import { fail, json, sameOrigin } from "@/lib/http";
import { getOrder, markPaid } from "@/lib/orders";
import { now } from "@/lib/db";

const schema = z.object({ orderId: z.string().uuid(), txHash: z.string().trim().min(40).max(100) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!rateLimit(`verify:${user.id}`, 20, 10 * 60 * 1000)) return fail("Muitas verificações seguidas. Aguarde um pouco.", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Informe o hash da transação.");
  const order = getOrder(parsed.data.orderId);
  if (!order || order.user_id !== user.id || order.method !== "crypto") return fail("Pedido não encontrado.", 404);
  if (order.status === "paid") return json({ ok: true, already: true });
  if (order.expires_at && order.expires_at < now()) return fail("Este pedido expirou. Crie um novo para gerar um valor atualizado.", 410);

  const result = await verifyCryptoPayment(order, parsed.data.txHash);
  if (!result.ok) return json({ ok: false, reason: result.reason }, 200);

  try {
    markPaid(order.id, { txHash: parsed.data.txHash.toLowerCase() });
  } catch {
    return json({ ok: false, reason: "Este hash já foi usado em outro pedido." }, 200);
  }
  return json({ ok: true });
}
