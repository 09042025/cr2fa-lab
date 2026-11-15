import { getUser } from "@/lib/auth";
import { fail, json, sameOrigin } from "@/lib/http";
import { mailEnabled } from "@/lib/mail";
import { runAttentionAlerts } from "@/lib/attention-alerts";

/** Envia agora o alerta ao próprio usuário (ignora o "ciente"), para testar se o e-mail chega. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const user = await getUser();
  if (!user) return fail("Faça login.", 401);
  if (user.plan !== "pro") return fail("Recurso do plano Premium.", 403);
  if (!mailEnabled()) return fail("O envio de e-mail não está configurado no servidor (RESEND_API_KEY e MAIL_FROM no Railway).", 503);
  try {
    const r = await runAttentionAlerts(undefined, { userId: user.id, ignoreAck: true });
    if (r.sent === 0) return json({ message: r.items === 0 ? "Nenhum ativo seu está com mais da metade dos indicadores ruins agora." : "Não foi possível enviar." });
    return json({ message: `E-mail enviado para ${user.email} com ${r.items} ativo(s). Se não chegar, confira o spam.` });
  } catch (e) {
    return fail(`Falha ao enviar: ${e instanceof Error ? e.message : "erro desconhecido"}`, 502);
  }
}
