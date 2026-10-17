import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { createCheckout, mercadoPagoEnabled } from "@/lib/mercadopago";
import { createOrder } from "@/lib/orders";

const schema = z.object({ period: z.enum(["monthly", "yearly"]) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!mercadoPagoEnabled()) return fail("Pagamento por Pix e cartão ainda não está disponível.", 503);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Plano inválido.");

  const order = createOrder({ userId: user.id, period: parsed.data.period, method: "mercadopago" });
  try {
    const { url } = await createCheckout(order, user.email);
    return json({ url, orderId: order.id });
  } catch (e) {
    console.error("[mercadopago] erro ao criar checkout:", e);
    return fail("Não foi possível iniciar o pagamento agora. Tente novamente em instantes.", 502);
  }
}
