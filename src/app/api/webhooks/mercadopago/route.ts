import { NextResponse } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";
import { getOrder, markPaid } from "@/lib/orders";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const dataId = url.searchParams.get("data.id") || (body.data?.id !== undefined ? String(body.data.id) : null);

  const valid = verifyWebhookSignature({
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });

  const type = url.searchParams.get("type") || body.type;
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  try {
    // Nunca confiamos no corpo do webhook: o status e o valor vêm da API do Mercado Pago.
    const payment = await getPayment(dataId);
    const order = payment.external_reference ? getOrder(payment.external_reference) : undefined;
    if (!order || order.method !== "mercadopago") return NextResponse.json({ ok: true, ignored: true });

    const amountOk = Math.round(payment.transaction_amount * 100) >= order.amount_cents && payment.currency_id === "BRL";
    if (payment.status === "approved" && amountOk) markPaid(order.id, { providerRef: String(payment.id) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[mercadopago] webhook:", e);
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 }); // o Mercado Pago tenta de novo
  }
}
