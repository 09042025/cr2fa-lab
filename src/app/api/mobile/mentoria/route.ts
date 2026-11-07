import { getUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { listMine, spots } from "@/lib/mentoria";
import { formatBRL, mentoriaPriceCents, MENTORIA_SESSIONS } from "@/lib/plans";

/** Mentoria com Niza para o app: preço, vagas e o andamento da mentoria do próprio usuário. O pagamento é feito no site. */
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Sessão expirada. Entre de novo.", 401);
  const s = spots();
  return json({
    price: formatBRL(mentoriaPriceCents()), sessions: MENTORIA_SESSIONS,
    spots: { left: s.left, limit: s.limit, turma: s.turma, full: s.full },
    mine: listMine(user.id).map((m) => ({ id: m.id, createdAt: m.createdAt, sessionsDone: m.sessionsDone })),
  });
}
