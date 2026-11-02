import { randomUUID } from "node:crypto";
import { db, now, type OrderRow, type UserRow } from "./db";
import { diamondPriceCents, mentoriaPriceCents, periodSeconds, priceCents, type Period, type Product } from "./plans";

export function createOrder(params: {
  userId: number;
  period: Period;
  product?: Product;
  method: "mercadopago" | "crypto";
  expiresInSec?: number;
}): OrderRow {
  const id = randomUUID();
  const t = now();
  db()
    .prepare(
      `INSERT INTO orders (id, user_id, period, product, amount_cents, method, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .run(
      id,
      params.userId,
      params.period,
      params.product ?? "premium",
      params.product === "mentoria" ? mentoriaPriceCents() : params.product === "diamond" ? diamondPriceCents() : priceCents(params.period),
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

    if (order.product === "mentoria") {
      // Mentoria é produto à parte: não altera o plano (Grátis/Premium) do aluno.
      d.prepare("INSERT OR IGNORE INTO mentorships (user_id, order_id) VALUES (?, ?)").run(order.user_id, order.id);
      return true;
    }
    if (order.product === "diamond") {
      // Plano Diamond: Premium vitalício (sem vencimento) + uma mentoria (12 aulas, uma única vez).
      d.prepare("UPDATE users SET plan = 'pro', plan_expires_at = NULL WHERE id = ?").run(order.user_id);
      d.prepare("INSERT OR IGNORE INTO mentorships (user_id, order_id) VALUES (?, ?)").run(order.user_id, order.id);
      return true;
    }
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

/** A conta tem o Plano Diamond (pedido pago)? */
export function hasDiamond(userId: number): boolean {
  return !!db().prepare("SELECT 1 FROM orders WHERE user_id = ? AND product = 'diamond' AND status = 'paid' LIMIT 1").get(userId);
}

export function expireStaleOrders(): void {
  db().prepare("UPDATE orders SET status = 'expired' WHERE status = 'pending' AND method = 'crypto' AND expires_at IS NOT NULL AND expires_at < ?").run(now());
}
