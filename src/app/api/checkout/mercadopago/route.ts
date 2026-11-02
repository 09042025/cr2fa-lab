import { z } from "zod";
import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { spots } from "@/lib/mentoria";
import { createCheckout, mercadoPagoEnabled } from "@/lib/mercadopago";
import { createOrder } from "@/lib/orders";

const schema = z.object({ period: z.enum(["monthly", "yearly"]).default("monthly"), product: z.enum(["premium", "mentoria", "diamond"]).default("premium") });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (!mercadoPagoEnabled()) return fail("Pagamento por Pix e cartão ainda não está disponível.", 503);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Plano inválido.");

  if (parsed.data.product === "mentoria" && spots().full) return fail("As vagas desta turma da Mentoria estão esgotadas. O Plano Diamond continua disponível.", 409);

  const order = createOrder({ userId: user.id, period: parsed.data.period, product: parsed.data.product, method: "mercadopago" });
  try {
    const { url } = await createCheckout(order, user.email);
    return json({ url, orderId: order.id });
  } catch (e) {
    console.error("[mercadopago] erro ao criar checkout:", e);
    return fail("Não foi possível iniciar o pagamento agora. Tente novamente em instantes.", 502);
  }
}
