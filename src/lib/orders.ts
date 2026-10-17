import { randomUUID } from "node:crypto";
import { db, now, type OrderRow, type UserRow } from "./db";
import { periodSeconds, priceCents, type Period } from "./plans";

export function createOrder(params: {
  userId: number;
  period: Period;
  method: "mercadopago" | "crypto";
  expiresInSec?: number;
}): OrderRow {
  const id = randomUUID();
  const t = now();
  db()
    .prepare(
      `INSERT INTO orders (id, user_id, period, amount_cents, method, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .run(
      id,
      params.userId,
      params.period,
      priceCents(params.period),
      params.method,
      t,
      params.expiresInSec ? t + params.expiresInSec : null,
    );
  return getOrder(id)!;
}

export function getOrder(id: string): OrderRow | undefined {
  return db().prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
}

export function listOrdersForUser(userId: number): OrderRow[] {
  return db().prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId) as OrderRow[];
}

/**
 * Marca o pedido como pago e estende o Pro do usuário. Idempotente:
 * só age se o pedido ainda estiver pendente. Retorna true se aplicou agora.
 */
export function markPaid(orderId: string, extra: { providerRef?: string; txHash?: string } = {}): boolean {
  const d = db();
  const run = d.transaction((): boolean => {
    const order = d.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as OrderRow | undefined;
    if (!order || order.status === "paid") return false;
    const t = now();
    d.prepare(
      "UPDATE orders SET status = 'paid', paid_at = ?, provider_ref = COALESCE(?, provider_ref), tx_hash = COALESCE(?, tx_hash) WHERE id = ?",
    ).run(t, extra.providerRef ?? null, extra.txHash ?? null, orderId);

    const user = d.prepare("SELECT * FROM users WHERE id = ?").get(order.user_id) as UserRow;
    const base = user.plan === "pro" && user.plan_expires_at && user.plan_expires_at > t ? user.plan_expires_at : t;
    d.prepare("UPDATE users SET plan = 'pro', plan_expires_at = ? WHERE id = ?").run(
      base + periodSeconds(order.period),
      order.user_id,
    );
    return true;
  });
  return run();
}

export function expireStaleOrders(): void {
  db().prepare("UPDATE orders SET status = 'expired' WHERE status = 'pending' AND method = 'crypto' AND expires_at IS NOT NULL AND expires_at < ?").run(now());
}
