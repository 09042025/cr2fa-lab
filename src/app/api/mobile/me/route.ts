import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";

/** Dados da conta (e do plano atual) para o app conferir a cada abertura. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  return json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan, planExpiresAt: user.planExpiresAt, onTrial: user.onTrial } });
}
