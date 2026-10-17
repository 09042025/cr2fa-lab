import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrderRow } from "./db";
import { periodLabel } from "./plans";

const API = "https://api.mercadopago.com";

export function mercadoPagoEnabled(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não configurado.");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mercado Pago respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Cria uma preferência do Checkout Pro. A página hospedada pelo Mercado Pago aceita
 * Pix e cartão de crédito. A confirmação chega pelo webhook e é revalidada na API.
 */
export async function createCheckout(order: OrderRow, payerEmail: string): Promise<{ url: string }> {
  const base = appUrl();
  const pref = await mp<{ init_point: string }>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          id: `pro-${order.period}`,
          title: `Plano Pro ${periodLabel(order.period)} - ${process.env.APP_NAME || "CR2FA Lab"}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: order.amount_cents / 100,
        },
      ],
      payer: { email: payerEmail },
      external_reference: order.id,
      notification_url: `${base}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${base}/planos?pedido=${order.id}`,
        pending: `${base}/planos?pedido=${order.id}`,
        failure: `${base}/planos?pedido=${order.id}&falhou=1`,
      },
      auto_return: "approved",
      payment_methods: { installments: 12 },
    }),
  });
  return { url: pref.init_point };
}

export interface MpPayment {
  id: number;
  status: string;
  currency_id: string;
  transaction_amount: number;
  external_reference: string | null;
}

export function getPayment(id: string): Promise<MpPayment> {
  return mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);
}

/**
 * Valida a assinatura do webhook (cabeçalho x-signature).
 * Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function verifyWebhookSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;
  const { signatureHeader, requestId, dataId } = params;
  if (!signatureHeader || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const id = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifest = `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && timingSafeEqual(a, b);
}
