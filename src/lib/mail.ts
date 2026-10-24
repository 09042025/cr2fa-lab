/**
 * Envio de e-mail pela API HTTP do Resend (https://resend.com), sem dependências extras.
 * Variáveis: RESEND_API_KEY e MAIL_FROM (ex.: "NIZA INVEST <contato@nizainvest.com.br>").
 */
export function mailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(params: { to: string; subject: string; html: string; text: string }): Promise<void> {
  if (!mailEnabled()) throw new Error("E-mail não configurado (RESEND_API_KEY e MAIL_FROM).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [params.to], subject: params.subject, html: params.html, text: params.text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend respondeu ${res.status}: ${body.slice(0, 300)}`);
  }
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function resetEmail(name: string, link: string): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  return {
    subject: `Redefinir sua senha - ${app}`,
    text: `${hello}\n\nRecebemos um pedido para redefinir a sua senha no ${app}. Abra o link abaixo para criar uma nova senha (vale por 1 hora):\n\n${link}\n\nSe você não pediu isso, ignore este e-mail. Sua senha continua a mesma.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Recebemos um pedido para redefinir a sua senha. O link vale por <strong>1 hora</strong>.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>
<p style="font-size:13px;color:#555">Se o botão não abrir, copie este endereço no navegador:<br>${escapeHtml(link)}</p>
<p style="font-size:13px;color:#555">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
</div>`,
  };
}

export function renewalEmail(name: string, daysLeft: number, expiresAt: Date, link: string, trial = false): { subject: string; html: string; text: string } {
  const app = process.env.APP_NAME || "NIZA INVEST";
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Olá, ${first}!` : "Olá!";
  const date = expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const when = daysLeft <= 1 ? "vence amanhã" : `vence em ${daysLeft} dias`;
  if (trial) {
    const endsWhen = daysLeft <= 1 ? "termina amanhã" : `termina em ${daysLeft} dias`;
    return {
      subject: daysLeft <= 1 ? `Seu teste grátis do Pró termina amanhã - ${app}` : `Seu teste grátis do Pró termina em ${daysLeft} dias - ${app}`,
      text: `${hello}\n\nSeu teste grátis do Pró no ${app} ${endsWhen} (${date}). Para continuar com o acesso completo, assine pelo link:\n\n${link}\n\nO tempo que ainda resta do teste é mantido: ao assinar, o plano começa a contar depois dele. Se não assinar, sua conta volta para o plano Grátis, sem nenhuma cobrança.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Seu <strong>teste grátis do Pró</strong> ${escapeHtml(endsWhen)} (<strong>${escapeHtml(date)}</strong>). Para continuar com o acesso completo, assine pelo botão abaixo.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Assinar o Pró</a></p>
<p style="font-size:13px;color:#555">O tempo que ainda resta do teste é mantido: ao assinar, o plano começa a contar depois dele. Se não assinar, sua conta volta para o plano Grátis, sem nenhuma cobrança.</p>
</div>`,
    };
  }
  return {
    subject: daysLeft <= 1 ? `Seu plano Pró vence amanhã - ${app}` : `Seu plano Pró vence em ${daysLeft} dias - ${app}`,
    text: `${hello}\n\nSeu plano Pró no ${app} ${when} (${date}). Para continuar com o acesso completo, renove pelo link:\n\n${link}\n\nA renovação soma ao tempo que ainda resta, então você não perde nada ao antecipar. Se já renovou, ignore este e-mail.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1a1a1a">
<h2 style="color:#b8860b">${escapeHtml(app)}</h2>
<p>${escapeHtml(hello)}</p>
<p>Seu plano <strong>Pró</strong> ${escapeHtml(when)} (<strong>${escapeHtml(date)}</strong>). Para continuar com o acesso completo, renove pelo botão abaixo.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d4a82f;color:#111;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Renovar o Pró</a></p>
<p style="font-size:13px;color:#555">A renovação soma ao tempo que ainda resta, então você não perde nada ao antecipar. Se já renovou, ignore este e-mail.</p>
</div>`,
  };
}
