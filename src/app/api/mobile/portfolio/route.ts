import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { BLOCKS, rebalance, type BlockKey } from "@/lib/protocol";

/** Portfólio do app (exclusivo Pró): posições e rebalanceamento pelo Protocolo, igual ao site. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Pró.", 403);
  const holdings = db().prepare("SELECT id, block, label, value_cents AS valueCents, source FROM holdings WHERE user_id = ? ORDER BY block, id").all(user.id) as { id: number; block: BlockKey; label: string; valueCents: number; source: string }[];
  const current = Object.fromEntries(BLOCKS.map((b) => [b.key, 0])) as Record<BlockKey, number>;
  for (const h of holdings) current[h.block] += h.valueCents;
  const rows = rebalance(current).map((r) => ({ key: r.block.key, name: r.block.name, color: r.block.color, currentCents: r.currentCents, currentPct: r.currentPct, targetCents: r.targetCents, diffCents: r.diffCents }));
  return json({ totalCents: rows.reduce((a, r) => a + r.currentCents, 0), rows, holdings });
}
