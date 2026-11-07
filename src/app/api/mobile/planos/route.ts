import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { hasDiamond } from "@/lib/orders";
import { spots } from "@/lib/mentoria";
import { trialDays } from "@/lib/trial";
import { DIAMOND_FEATURES, DIAMOND_NAME, diamondPriceCents, formatBRL, mentoriaPriceCents, MENTORIA_SESSIONS, PLAN_FEATURES, priceCents } from "@/lib/plans";

/** Planos e pagamento para o app: os mesmos planos e preços do site (Premium mensal/anual, Mentoria e Diamond). O pagamento é feito no site. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const diamond = hasDiamond(user.id);
  const s = spots();
  return json({
    current: diamond ? "Diamond (Premium vitalício + Mentoria)" : user.role === "admin" ? "Acesso total (administrador)" : user.plan === "pro" ? "Premium" : "Grátis",
    until: user.plan === "pro" && user.role !== "admin" && user.planExpiresAt ? { at: user.planExpiresAt, trial: user.onTrial } : null,
    trial: user.trialAvailable ? trialDays() : 0,
    diamond,
    premium: { monthly: formatBRL(priceCents("monthly")), yearly: formatBRL(priceCents("yearly")), features: PLAN_FEATURES.pro, free: PLAN_FEATURES.free },
    mentoria: { price: formatBRL(mentoriaPriceCents()), sessions: MENTORIA_SESSIONS, spots: { left: s.left, limit: s.limit, turma: s.turma, full: s.full } },
    diamondPlan: { name: DIAMOND_NAME, price: formatBRL(diamondPriceCents()), features: DIAMOND_FEATURES },
  });
}
