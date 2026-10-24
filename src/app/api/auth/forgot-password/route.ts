import { z } from "zod";
import { rateLimit } from "@/lib/auth";
import { db, type UserRow } from "@/lib/db";
import { clientIp, fail, json, sameOrigin } from "@/lib/http";
import { mailEnabled, resetEmail, sendMail } from "@/lib/mail";
import { createResetToken } from "@/lib/reset";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// A resposta é sempre a mesma, exista o e-mail ou não, para não revelar quem tem conta.
const GENERIC = "Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha. Confira também a caixa de spam.";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Origem inválida.", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Informe um e-mail válido.");
  const { email } = parsed.data;

  const hour = 60 * 60 * 1000;
  if (!rateLimit(`forgot-ip:${clientIp(req)}`, 10, hour) || !rateLimit(`forgot-email:${email}`, 3, hour)) {
    return fail("Muitos pedidos. Aguarde um pouco e tente de novo.", 429);
  }

  const user = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (user) {
    if (!mailEnabled()) {
      console.error("[recuperar-senha] E-mail não configurado: defina RESEND_API_KEY e MAIL_FROM na Railway.");
    } else {
      const link = `${(process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "")}/redefinir-senha?token=${createResetToken(user.id)}`;
      // Sem await de propósito: o tempo de resposta não deve mostrar se o e-mail existe.
      sendMail({ to: user.email, ...resetEmail(user.name, link) }).catch((e) => console.error("[recuperar-senha] falha ao enviar:", e));
    }
  }
  return json({ ok: true, message: GENERIC });
}
